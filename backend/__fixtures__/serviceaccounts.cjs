//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { PassThrough } = require('stream')
const { cloneDeep, merge, get, set, filter, find, split } = require('lodash')
const createError = require('http-errors')
const pathToRegexp = require('path-to-regexp')

const { parseFieldSelector } = require('./helper')
const { getTokenPayload } = require('./auth')

const serviceAccountList = [
  getServiceAccount({ namespace: 'garden-foo', name: 'robot', createdBy: 'foo@example.org' }),
  getServiceAccount({ namespace: 'garden-foo', name: 'robot-nomember' }),
  getServiceAccount({ namespace: 'garden-foo', name: 'dashboard-webterminal' }),
  getServiceAccount({ namespace: 'garden-bar', name: 'robot', createdBy: 'bar@example.org' }),
  getServiceAccount({ namespace: 'term-host-1', name: 'term-attach-1' }),
  getServiceAccount({ namespace: 'term-host-2', name: 'term-attach-2' }),
  getServiceAccount({ namespace: 'term-host-3', name: 'term-attach-3' }),
]

function getServiceAccount ({
  namespace,
  name,
  createdBy = 'admin@example.org',
  creationTimestamp = '2020-01-01T00:00:00Z',
}) {
  return {
    metadata: {
      name,
      namespace,
      creationTimestamp,
      annotations: {
        'gardener.cloud/created-by': createdBy,
      },
    },
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
  },
}

const matchOptions = { decode: decodeURIComponent }
const matchList = pathToRegexp.match('/api/v1/namespaces/:namespace/serviceaccounts', matchOptions)
const matchItem = pathToRegexp.match('/api/v1/namespaces/:namespace/serviceaccounts/:name', matchOptions)
const matchToken = pathToRegexp.match('/api/v1/namespaces/:namespace/serviceaccounts/:name/token', matchOptions)

const mocks = {
  list () {
    return headers => {
      const matchResult = matchList(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { namespace } = {} } = matchResult
      const items = serviceaccounts.list(namespace)
      return Promise.resolve({ items })
    }
  },
  create ({ uid = 21, resourceVersion = '42', creationTimestamp = 'now' } = {}) {
    return (headers, json) => {
      const matchResult = matchList(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { namespace } = {} } = matchResult
      const payload = getTokenPayload(headers)
      const item = cloneDeep(json)
      set(item, ['metadata', 'namespace'], namespace)
      set(item, ['metadata', 'resourceVersion'], resourceVersion)
      set(item, ['metadata', 'uid'], uid)
      set(item, ['metadata', 'creationTimestamp'], creationTimestamp)
      set(item, ['metadata', 'annotations', 'gardener.cloud/created-by'], payload.id)
      return Promise.resolve(item)
    }
  },
  createTokenRequest ({ token = 'secret' } = {}) {
    return (headers, json) => {
      const matchResult = matchToken(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const item = cloneDeep(json)
      set(item, ['status', 'token'], token)
      return Promise.resolve(item)
    }
  },
  watch ({ end = false } = {}) {
    return headers => {
      const [pathname] = split(headers[':path'], '?')
      const matchResult = matchList(pathname)
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { namespace } = {} } = matchResult
      const fieldSelector = parseFieldSelector(headers)
      const items = filter(serviceaccounts.list(namespace), fieldSelector)
      const stream = new PassThrough({ objectMode: true })
      process.nextTick(() => {
        for (const item of items) {
          const event = {
            type: 'ADDED',
            object: cloneDeep(item),
          }
          stream.write(event)
        }
        if (end === true) {
          stream.end()
        }
      })
      return stream
    }
  },
  get () {
    return headers => {
      const matchResult = matchItem(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { namespace, name } = {} } = matchResult
      const item = serviceaccounts.get(namespace, name)
      if (!item) {
        return Promise.reject(createError(404))
      }
      return Promise.resolve(item)
    }
  },
  patch () {
    return (headers, json) => {
      const matchResult = matchItem(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { namespace, name } = {} } = matchResult
      const item = serviceaccounts.get(namespace, name)
      const resourceVersion = get(item, ['metadata', 'resourceVersion'], '42')
      merge(item, json)
      set(item, ['metadata', 'resourceVersion'], (+resourceVersion + 1).toString())
      return Promise.resolve(item)
    }
  },
  delete () {
    return headers => {
      const matchResult = matchItem(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { namespace, name } = {} } = matchResult
      const item = serviceaccounts.get(namespace, name)
      return Promise.resolve(item)
    }
  },
}

module.exports = {
  ...serviceaccounts,
  mocks,
}
