//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const { GoogleToken } = require('gtoken')
const yaml = require('js-yaml')

const PROPERTY_NAMES = ['apiVersion', 'kind', 'current-context', 'contexts', 'clusters', 'users']

class Config {
  constructor (input) {
    if (!input) {
      throw new TypeError('Kubeconfig must not be empty')
    }
    if (typeof input === 'string') {
      input = yaml.load(input)
    }
    input = _
      .chain(input)
      .pick(PROPERTY_NAMES)
      .cloneDeep()
      .value()
    Object.assign(this, {
      apiVersion: 'v1',
      kind: 'Config'
    }, input)
  }

  get currentContext () {
    return _
      .chain(this.contexts)
      .find(['name', this['current-context']])
      .get('context')
      .value()
  }

  get currentCluster () {
    return _
      .chain(this.clusters)
      .find(['name', this.currentContext.cluster])
      .get('cluster')
      .value()
  }

  get currentUser () {
    return _
      .chain(this.users)
      .find(['name', this.currentContext.user])
      .get('user')
      .value()
  }

  toJSON () {
    return _.pick(this, PROPERTY_NAMES)
  }

  toYAML () {
    return yaml.dump(this.toJSON())
  }

  clean () {
    const cleanCluster = ({ name, cluster }) => {
      cluster = _.pick(cluster, ['server', 'insecure-skip-tls-verify', 'certificate-authority-data'])
      return { name, cluster }
    }
    const cleanContext = ({ name, context }) => {
      context = _.pick(context, ['cluster', 'user', 'namespace'])
      return { name, context }
    }
    const cleanAuthInfo = ({ name, user }) => {
      user = _.pick(user, ['client-certificate-data', 'client-key-data', 'token', 'username', 'password', 'auth-provider'])
      if (user['auth-provider'] && user['auth-provider'].name !== 'gcp') {
        delete user['auth-provider']
      }
      return { name, user }
    }
    const cleanConfig = ({
      contexts,
      clusters,
      users,
      ...rest
    }) => ({
      ...rest,
      contexts: _.map(contexts, cleanContext),
      clusters: _.map(clusters, cleanCluster),
      users: _.map(users, cleanAuthInfo)
    })
    return new Config(cleanConfig(this.toJSON()))
  }

  async refreshAuthProviderConfig (options) {
    const authProvider = this.currentUser['auth-provider']
    if (authProvider) {
      switch (authProvider.name) {
        case 'gcp': {
          const {
            private_key: key,
            client_email: email
          } = options
          const gToken = new GoogleToken({
            key,
            email,
            scope: ['https://www.googleapis.com/auth/cloud-platform'],
            eagerRefreshThresholdMillis: 5 * 60 * 1000
          })
          authProvider.config = authProvider.config || {}
          const {
            'access-token': accessToken,
            expiry = '1970-01-01T00:00:00.000Z'
          } = authProvider.config
          if (accessToken) {
            gToken.expiresAt = new Date(expiry).getTime()
            gToken.rawToken = {
              access_token: accessToken,
              token_type: 'Bearer'
            }
          }
          await gToken.getToken()
          authProvider.config['access-token'] = gToken.accessToken
          authProvider.config.expiry = new Date(gToken.expiresAt).toISOString()
        }
      }
    }
  }

  static parse (input) {
    return input instanceof Config
      ? input
      : new Config(input)
  }

  static build (cluster, user, { userName = 'robot', clusterName = 'garden', contextName = 'default', namespace } = {}) {
    const context = {
      cluster: clusterName,
      user: userName
    }
    if (namespace) {
      context.namespace = namespace
    }

    return new Config({
      clusters: [{
        name: clusterName,
        cluster
      }],
      users: [{
        name: userName,
        user
      }],
      contexts: [{
        name: contextName,
        context
      }],
      'current-context': contextName
    })
  }
}

module.exports = Config
