//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const yaml = require('js-yaml')
const createError = require('http-errors')
const { mapValues, split, startsWith, endsWith } = require('lodash')
const pathToRegexp = require('path-to-regexp')
const { toBase64 } = require('./helper')
const seeds = require('./seeds')

const certificateAuthorityData = toBase64('certificate-authority-data')
const clientCertificateData = toBase64('client-certificate-data')
const clientKeyData = toBase64('client-key-data')

function getSecret ({ namespace, name, data }) {
  return {
    metadata: {
      namespace,
      name
    },
    data: mapValues(data, toBase64)
  }
}

function getKubeconfig ({ server, name = 'default' }) {
  const cluster = {
    'certificate-authority-data': certificateAuthorityData,
    server
  }
  const user = {
    'client-certificate-data': clientCertificateData,
    'client-key-data': clientKeyData
  }
  const context = {
    cluster: name,
    user: name
  }
  return yaml.safeDump({
    kind: 'Config',
    clusters: [{ cluster, name }],
    contexts: [{ context, name }],
    users: [{ user, name }],
    'current-context': name
  })
}

const secrets = {
  getShootSecret (namespace, name) {
    const shootName = name.substring(0, name.length - 11)
    const projectName = namespace.replace(/^garden-/, '')
    return getSecret({
      name,
      namespace,
      data: {
        kubeconfig: getKubeconfig({
          server: `https://api.${shootName}.${projectName}.shoot.cluster`,
          name: `shoot--${projectName}--${shootName}`
        }),
        username: `user-${projectName}-${shootName}`,
        password: `pass-${projectName}-${shootName}`
      }
    })
  },
  getSeedSecret (namespace, name) {
    const seedName = name.substring(11)
    const seed = seeds.get(seedName)
    const { type, region } = seed.spec.provider
    return getSecret({
      name,
      namespace,
      data: {
        kubeconfig: getKubeconfig({
          server: `https://api.${region}.${type}.seed.cluster`,
          name: `shoot--garden--${seedName}`
        })
      }
    })
  },
  getMonitoringSecret (namespace, name = 'monitoring-ingress-credentials') {
    const [, projectName, shootName] = split(namespace, '--')
    return getSecret({
      name,
      namespace,
      data: {
        username: `user-${projectName}-${shootName}`,
        password: `pass-${projectName}-${shootName}`
      }
    })
  }
}

const mocks = {
  get () {
    const path = '/api/v1/namespaces/:namespace/secrets/:name'
    const match = pathToRegexp.match(path, { decode: decodeURIComponent })
    return headers => {
      const { params: { namespace, name } = {} } = match(headers[':path']) || {}
      const [hostname] = split(headers[':authority'], ':')
      if (hostname === 'kubernetes') {
        if (namespace === 'garden' && startsWith(name, 'seedsecret-')) {
          const item = secrets.getSeedSecret(namespace, name)
          return Promise.resolve(item)
        }
        if (endsWith(name, '.kubeconfig')) {
          const item = secrets.getShootSecret(namespace, name)
          return Promise.resolve(item)
        }
      } else if (endsWith(hostname, 'seed.cluster')) {
        if (name === 'monitoring-ingress-credentials') {
          const item = secrets.getMonitoringSecret(namespace, name)
          return Promise.resolve(item)
        }
      }
      return Promise.reject(createError(404))
    }
  }
}

module.exports = {
  ...secrets,
  mocks
}
