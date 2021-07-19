//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const yaml = require('js-yaml')
const Config = require('./Config')

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
  return Config.parse(input)
}

function cleanKubeconfig (input) {
  const kubeconfig = parseKubeconfig(input)
  return kubeconfig.clean()
}

function fromKubeconfig (input) {
  const {
    currentCluster: cluster,
    currentUser: user
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
  return new Config({
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
  }).toYAML()
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
  parseKubeconfig,
  dumpKubeconfig,
  load
}
