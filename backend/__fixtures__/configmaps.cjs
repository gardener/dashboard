//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { cloneDeep, endsWith, find, filter, split, isEmpty } = require('lodash')
const createError = require('http-errors')
const pathToRegexp = require('path-to-regexp')
const { createUrl } = require('./helper')

function getConfigMap ({ namespace, name, labels, creationTimestamp, data = {} }) {
  const metadata = {
    namespace,
    name,
  }
  if (!isEmpty(labels)) {
    metadata.labels = labels
  }

  if (creationTimestamp) {
    metadata.creationTimestamp = creationTimestamp
  }

  return { metadata, data }
}

function getClusterIdentitConfigMap ({ identity = 'landscape-test' } = {}) {
  return getConfigMap({
    namespace: 'kube-system',
    name: 'cluster-identity',
    data: {
      'cluster-identity': identity,
    },
  })
}

const configMapsList = [
  getClusterIdentitConfigMap(),
]

const configMaps = {
  get (namespace, name) {
    const items = configMaps.list(namespace)
    return find(items, ['metadata.name', name])
  },
  list (namespace) {
    const items = cloneDeep(configMapsList)
    return namespace
      ? filter(items, ['metadata.namespace', namespace])
      : items
  },
  createClusterIdentityConfigMap (identity) {
    return getClusterIdentitConfigMap({ identity })
  },
  getCaClusterConfigMap (namespace, name) {
    return getConfigMap({
      name,
      namespace,
      labels: {
        'gardener.cloud/role': 'ca-cluster',
      },
      data: {
        'ca.crt': 'ca.crt',
      },
    })
  },
}

const matchOptions = { decode: decodeURIComponent }
const matchList = pathToRegexp.match('/api/v1/namespaces/:namespace/configmaps', matchOptions)
const matchItem = pathToRegexp.match('/api/v1/namespaces/:namespace/configmaps/:name', matchOptions)

const mocks = {
  list ({ forceEmpty = false } = {}) {
    return headers => {
      if (forceEmpty) {
        return Promise.resolve({ items: [] })
      }

      const url = createUrl(headers)
      const matchResult = matchList(url.pathname)
      if (matchResult) {
        const { params: { namespace } = {} } = matchResult
        const items = configMaps.list(namespace)
        return Promise.resolve({ items })
      }

      return Promise.reject(createError(503))
    }
  },
  get (options) {
    return headers => {
      const matchResult = matchItem(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { namespace, name } = {} } = matchResult

      if (namespace === 'kube-system' && name === 'cluster-identity') {
        const [hostname] = split(headers[':authority'], ':')
        const item = configMaps.createClusterIdentityConfigMap(hostname)
        return Promise.resolve(item)
      }
      if (endsWith(name, '.ca-cluster')) {
        const item = configMaps.getCaClusterConfigMap(namespace, name)
        return Promise.resolve(item)
      }

      const item = configMaps.get(namespace, name)
      if (item) {
        return Promise.resolve(item)
      }

      return Promise.reject(createError(404))
    }
  },
}

module.exports = {
  ...configMaps,
  mocks,
}
