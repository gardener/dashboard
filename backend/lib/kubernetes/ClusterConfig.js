//
// Copyright 2018 by The Gardener Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict'
/* eslint no-process-env: 0 no-sync:0 */

const { existsSync, readFileSync } = require('fs')
const path = require('path')
const _ = require('lodash')
const yaml = require('js-yaml')

class ClusterConfig {
  constructor ({url, ca, key, cert, auth, namespace, insecureSkipTlsVerify = false}) {
    this.url = url
    this.ca = ca
    this.key = key
    this.cert = cert
    this.auth = !_.isEmpty(auth) ? auth : undefined
    this.namespace = namespace
    this.insecureSkipTlsVerify = insecureSkipTlsVerify
  }

  static inClusterPossible () {
    return !_.isNil(this.SERVICE_HOST) && !_.isNil(this.SERVICE_PORT) && this.existsSync(this.TOKEN_PATH)
  }

  static inCluster () {
    if (!this.SERVICE_HOST || !this.SERVICE_PORT) {
      throw new TypeError(
        'Unable to load in-cluster configuration, KUBERNETES_SERVICE_HOST' +
        ' and KUBERNETES_SERVICE_PORT must be defined')
    }
    const url = `https://${this.SERVICE_HOST}:${this.SERVICE_PORT}`
    const ca = this.readFileSync(this.CA_PATH, 'utf8')
    const auth = {
      bearer: this.readFileSync(this.TOKEN_PATH, 'utf8')
    }
    const namespace = this.readFileSync(this.NAMESPACE_PATH, 'utf8')
    return new ClusterConfig({url, ca, auth, namespace})
  }

  static fromKubeconfigPossible () {
    return this.KUBECONFIG_PATH && this.existsSync(this.KUBECONFIG_PATH)
  }

  static fromKubeconfig ({kubeconfig, current}) {
    kubeconfig = kubeconfig || this.readFileSync(this.KUBECONFIG_PATH)
    if (_.isString(kubeconfig) || Buffer.isBuffer(kubeconfig)) {
      kubeconfig = yaml.safeLoad(kubeconfig)
    }
    current = current || kubeconfig['current-context']
    const context = _
      .chain(kubeconfig.contexts)
      .find(item => item.name === current)
      .get('context')
      .value()
    const cluster = _
      .chain(kubeconfig.clusters)
      .find(item => item.name === context.cluster)
      .get('cluster')
      .value()
    const user = _
      .chain(kubeconfig.users)
      .find(user => user.name === context.user)
      .get('user')
      .value()

    let url
    let ca
    let insecureSkipTlsVerify = false
    if (cluster) {
      url = cluster.server
      if (cluster['certificate-authority']) {
        ca = this.readFileSync(path.normalize(cluster['certificate-authority']))
      } else if (cluster['certificate-authority-data']) {
        ca = Buffer.from(cluster['certificate-authority-data'], 'base64').toString()
      }
      if (cluster['insecure-skip-tls-verify']) {
        insecureSkipTlsVerify = cluster['insecure-skip-tls-verify']
      }
    }

    let cert
    let key
    const auth = {}
    if (user) {
      if (user['client-certificate']) {
        cert = this.readFileSync(path.normalize(user['client-certificate']))
      } else if (user && user['client-certificate-data']) {
        cert = Buffer.from(user['client-certificate-data'], 'base64').toString()
      }

      if (user['client-key']) {
        key = this.readFileSync(path.normalize(user['client-key']))
      } else if (user['client-key-data']) {
        key = Buffer.from(user['client-key-data'], 'base64').toString()
      }

      if (user.token) {
        auth.bearer = user.token
      }

      const authProvider = user['auth-provider']
      if (authProvider) {
        const authProviderConfig = authProvider.config || {}
        switch (authProvider.name) {
          case 'oidc':
            auth.bearer = authProviderConfig['id-token']
            break
          default:
            if (authProviderConfig['access-token']) {
              auth.bearer = authProviderConfig['access-token']
            }
        }
      }

      if (user.username) {
        auth.user = user.username
      }
      if (user.password) {
        auth.pass = user.password
      }
    }

    return new ClusterConfig({url, ca, key, cert, auth, insecureSkipTlsVerify})
  }

  static load () {
    if (/^test$/.test(process.env.NODE_ENV)) {
      return new ClusterConfig({
        url: 'http://cluster.local:8001',
        auth: {
          bearer: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50OmdhcmRlbjpkZWZhdWx0In0.-4rSuvvj5BStN6DwnmLAaRVbgpl5iCn2hG0pcqx0NPw'
        },
        namespace: 'garden'
      })
    }
    if (this.inClusterPossible()) {
      return this.inCluster()
    }
    if (this.fromKubeconfigPossible()) {
      return this.fromKubeconfig({})
    }
    throw new TypeError('Unable to load any cluster configuration')
  }

  static get SERVICE_HOST () {
    return process.env.KUBERNETES_SERVICE_HOST
  }

  static get SERVICE_PORT () {
    return process.env.KUBERNETES_SERVICE_PORT
  }

  static get CA_PATH () {
    return '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt'
  }

  static get TOKEN_PATH () {
    return '/var/run/secrets/kubernetes.io/serviceaccount/token'
  }

  static get NAMESPACE_PATH () {
    return '/var/run/secrets/kubernetes.io/serviceaccount/namespace'
  }

  static get HOME_DIR () {
    return process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME']
  }

  static get KUBECONFIG_PATH () {
    const homeDir = this.HOME_DIR
    return process.env.KUBECONFIG || path.join(homeDir, '.kube', 'config')
  }
}

ClusterConfig.existsSync = existsSync
ClusterConfig.readFileSync = readFileSync

module.exports = ClusterConfig
