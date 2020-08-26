//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

const _ = require('lodash')
const fs = require('fs')
const os = require('os')
const path = require('path')
const yaml = require('js-yaml')

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
    user = _.pick(user, ['client-certificate-data', 'client-key-data', 'token', 'username', 'password'])
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
  const { context } = _.find(contexts, ['name', currentContext]) || {}
  const { cluster } = _.find(clusters, ['name', context.cluster]) || {}
  const { user } = _.find(users, ['name', context.user]) || {}

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
  cleanKubeconfig,
  fromKubeconfig (input) {
    // required for testing
    input = exports.cleanKubeconfig(input)
    return fromKubeconfig(input)
  },
  dumpKubeconfig,
  load
}
