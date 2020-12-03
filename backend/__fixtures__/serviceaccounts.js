//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { cloneDeep, merge, get, set, filter, find } = require('lodash')
const createError = require('http-errors')
const pathToRegexp = require('path-to-regexp')

const { toHex } = require('./helper')
const { getTokenPayload } = require('./auth')

const serviceAccountList = [
  getServiceAccount({ namespace: 'garden-foo', name: 'robot', createdBy: 'foo@example.org' }),
  getServiceAccount({ namespace: 'garden-foo', name: 'robot-nomember' }),
  getServiceAccount({ namespace: 'garden-bar', name: 'robot', createdBy: 'bar@example.org' })
]

function getServiceAccount ({
  namespace,
  name,
  createdBy = 'admin@example.org',
  creationTimestamp = '2020-01-01T00:00:00Z'
}) {
  return {
    metadata: {
      name,
      namespace,
      creationTimestamp,
      annotations: {
        'gardener.cloud/created-by': createdBy
      }
    },
    secrets: [{
      name: [name, 'token', toHex(name).substring(0, 5)].join('-')
    }]
  }
}

const serviceaccounts = {
  create (options) {
    return getServiceAccount(options)
  },
  get (namespace, name) {
    const items = serviceaccounts.list(namespace)
    return find(items, ['metadata.name', name])
  },
  list (namespace) {
    const items = cloneDeep(serviceAccountList)
    return namespace
      ? filter(items, ['metadata.namespace', namespace])
      : items
  }
}

const mocks = {
  list () {
    const path = '/api/v1/namespaces/:namespace/serviceaccounts'
    const match = pathToRegexp.match(path, { decode: decodeURIComponent })
    return headers => {
      const { params: { namespace } = {} } = match(headers[':path']) || {}
      const items = serviceaccounts.list(namespace)
      return Promise.resolve({ items })
    }
  },
  get () {
    const path = '/api/v1/namespaces/:namespace/serviceaccounts/:name'
    const match = pathToRegexp.match(path, { decode: decodeURIComponent })
    return headers => {
      const { params: { namespace, name } = {} } = match(headers[':path']) || {}
      const item = serviceaccounts.get(namespace, name)
      if (!item) {
        return Promise.reject(createError(404))
      }
      return Promise.resolve(item)
    }
  },
  create ({ uid = 21, resourceVersion = '42', creationTimestamp = 'now' } = {}) {
    const path = '/apis/core.gardener.cloud/v1beta1/namespaces/:namespace/shoots'
    const match = pathToRegexp.match(path, { decode: decodeURIComponent })
    return (headers, json) => {
      const { params: { namespace } = {} } = match(headers[':path']) || {}
      const payload = getTokenPayload(headers)
      const item = cloneDeep(json)
      set(item, 'metadata.namespace', namespace)
      set(item, 'metadata.resourceVersion', resourceVersion)
      set(item, 'metadata.uid', uid)
      set(item, 'metadata.creationTimestamp', creationTimestamp)
      set(item, 'metadata.annotations["gardener.cloud/created-by"]', payload.id)
      return Promise.resolve(item)
    }
  },
  patch () {
    const path = '/apis/core.gardener.cloud/v1beta1/namespaces/:namespace/shoots/:name'
    const match = pathToRegexp.match(path, { decode: decodeURIComponent })
    return (headers, json) => {
      const { params: { namespace, name } = {} } = match(headers[':path']) || {}
      const item = serviceaccounts.get(namespace, name)
      const resourceVersion = get(item, 'metadata.resourceVersion', '42')
      merge(item, json)
      set(item, 'metadata.resourceVersion', (+resourceVersion + 1).toString())
      return Promise.resolve(item)
    }
  },
  delete () {
    const path = '/apis/core.gardener.cloud/v1beta1/namespaces/:namespace/shoots/:name'
    const match = pathToRegexp.match(path, { decode: decodeURIComponent })
    return headers => {
      const { params: { namespace, name } = {} } = match(headers[':path']) || {}
      const item = serviceaccounts.get(namespace, name)
      return Promise.resolve(item)
    }
  }
}

module.exports = {
  ...serviceaccounts,
  mocks
}
