//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const fs = require('fs')
const os = require('os')
const path = require('path')
const yaml = require('js-yaml')
const { GoogleToken } = require('gtoken')

function getInCluster ({
  KUBERNETES_SERVICE_HOST: host,
  KUBERNETES_SERVICE_PORT: port
} = {}) {
  if (!host || !port) {
    throw new TypeError('Failed to load in-cluster configuration, kubernetes service endpoint not defined')
  }
  const baseDir = '/var/run/secrets/kubernetes.io/serviceaccount/'
  const tokenPath = path.join(baseDir, 'token')
  const token = fs.readFileSync(tokenPath, 'utf8')
  if (!token) {
    throw new TypeError('Failed to load in-cluster configuration, serviceaccount token not found')
  }

  const caPath = path.join(baseDir, 'ca.crt')
  const ca = fs.readFileSync(caPath, 'utf8')
  if (!ca) {
    throw new TypeError('Failed to load in-cluster configuration, serviceaccount certificate authority not found')
  }

  const config = {
    url: `https://${host}:${port}`,
    ca,
    rejectUnauthorized: true,
    auth: {
      bearer: token
    }
  }
  return config
}

function readKubeconfig (filename) {
  if (!filename) {
    filename = path.join(os.homedir(), '.kube', 'config')
  }
  if (filename.indexOf(':') !== -1) {
    filename = filename.split(':')
  }
  // use the first kubeconfig file
  if (Array.isArray(filename)) {
    filename = filename.shift()
  }
  const dirname = path.dirname(filename)
  const config = yaml.safeLoad(fs.readFileSync(filename))
  const resolvePath = (object, key) => {
    if (object[key]) {
      object[key] = path.resolve(dirname, object[key])
    }
  }
  for (const { cluster } of config.clusters) {
    resolvePath(cluster, 'certificate-authority')
  }
  for (const { user } of config.users) {
    resolvePath(user, 'client-key')
    resolvePath(user, 'client-certificate')
  }
  return config
}

function parseKubeconfig (input) {
  if (input) {
    switch (typeof input) {
      case 'string':
        return yaml.safeLoad(input)
      default:
        return input
    }
  }
  throw new TypeError('Kubeconfig must not be empty')
}

function cleanKubeconfig (input) {
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
    apiVersion = 'v1',
    kind = 'Config',
    clusters,
    contexts,
    'current-context': currentContext,
    users
  }) => {
    return {
      apiVersion,
      kind,
      clusters: _.map(clusters, cleanCluster),
      contexts: _.map(contexts, cleanContext),
      'current-context': currentContext,
      users: _.map(users, cleanAuthInfo)
    }
  }
  return cleanConfig(parseKubeconfig(input))
}

async function refreshAuthProviderConfig (input, options = {}) {
  const kubeconfig = parseKubeconfig(input)
  const {
    'current-context': currentContext,
    contexts,
    users
  } = kubeconfig

  const context = _
    .chain(contexts)
    .find(['name', currentContext])
    .get('context')
    .value()
  const user = _
    .chain(users)
    .find(['name', context.user])
    .get('user')
    .value()

  if (user['auth-provider']) {
    const { name, config = {} } = user['auth-provider']
    switch (name) {
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
        gToken.expiresAt = new Date(config.expiry || '1970-01-01T00:00:00.000Z').getTime()
        gToken.rawToken = {
          access_token: config['access-token'],
          token_type: 'Bearer'
        }
        await gToken.getToken()
        config['access-token'] = gToken.accessToken
        config.expiry = new Date(gToken.expiresAt).toISOString()
        return yaml.safeDump(kubeconfig)
      }
    }
  }
  return input
}

function fromKubeconfig (input) {
  const {
    clusters,
    contexts,
    'current-context': currentContext,
    users
  } = parseKubeconfig(input)

  // inline certificates and keys
  const readCertificate = (obj, name) => {
    if (obj[name]) {
      return fs.readFileSync(obj[name])
    }
    if (obj[`${name}-data`]) {
      return Buffer.from(obj[`${name}-data`], 'base64').toString('utf8')
    }
  }

  // get current user and cluster
  const context = _
    .chain(contexts)
    .find(['name', currentContext])
    .get('context')
    .value()
  const cluster = _
    .chain(clusters)
    .find(['name', context.cluster])
    .get('cluster')
    .value()
  const user = _
    .chain(users)
    .find(['name', context.user])
    .get('user')
    .value()

  const config = {
    rejectUnauthorized: true
  }

  if (cluster) {
    config.url = cluster.server
    const ca = readCertificate(cluster, 'certificate-authority')
    if (ca) {
      config.ca = ca
    }
    if ('insecure-skip-tls-verify' in cluster) {
      config.rejectUnauthorized = !cluster['insecure-skip-tls-verify']
    }
  }

  if (user) {
    const cert = readCertificate(user, 'client-certificate')
    const key = readCertificate(user, 'client-key')
    if (cert && key) {
      config.cert = cert
      config.key = key
    } else if (user.token) {
      config.auth = {
        bearer: user.token
      }
    } else if (user.username && user.password) {
      config.auth = {
        user: user.username,
        pass: user.password
      }
    } else if (user['auth-provider']) {
      const {
        name,
        config: authProviderConfig = {}
      } = user['auth-provider']
      switch (name) {
        case 'gcp': {
          const {
            'access-token': accessToken,
            expiry = '1970-01-01T00:00:00.000Z'
          } = authProviderConfig
          if (new Date() < new Date(expiry)) {
            config.auth = {
              bearer: accessToken
            }
          }
          break
        }
      }
    }
  }

  return config
}

function dumpKubeconfig ({ user, context = 'default', cluster = 'garden', namespace, token, server, caData }) {
  return yaml.safeDump({
    apiVersion: 'v1',
    kind: 'Config',
    clusters: [{
      name: cluster,
      cluster: {
        'certificate-authority-data': caData,
        server
      }
    }],
    users: [{
      name: user,
      user: {
        token
      }
    }],
    contexts: [{
      name: context,
      context: {
        cluster,
        user,
        namespace
      }
    }],
    'current-context': context
  })
}

function load (env = process.env) {
  if (/^test/.test(env.NODE_ENV)) {
    return {
      url: 'https://kubernetes:6443',
      auth: {
        bearer: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50OmdhcmRlbjpkZWZhdWx0In0.-4rSuvvj5BStN6DwnmLAaRVbgpl5iCn2hG0pcqx0NPw'
      }
    }
  }
  if (env.KUBECONFIG) {
    return fromKubeconfig(readKubeconfig(env.KUBECONFIG))
  }
  try {
    return getInCluster(env)
  } catch (err) {
    return fromKubeconfig(readKubeconfig())
  }
}

exports = module.exports = {
  getInCluster,
  cleanKubeconfig,
  fromKubeconfig (input) {
    // required for testing
    input = exports.cleanKubeconfig(input)
    return fromKubeconfig(input)
  },
  refreshAuthProviderConfig,
  dumpKubeconfig,
  load
}
