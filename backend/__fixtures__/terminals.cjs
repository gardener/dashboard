//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { PassThrough } = require('stream')
const { cloneDeep, merge, find, filter, get, set, isEmpty, split, padStart } = require('lodash')
const hash = require('object-hash')
const createError = require('http-errors')
const pathToRegexp = require('path-to-regexp')

const { parseLabelSelector, parseFieldSelector } = require('./helper')

const terminalList = [
  getTerminal({
    target: 'garden',
    namespace: 'garden-foo',
    identifier: '1',
  }),
  getTerminal({
    target: 'cp',
    namespace: 'garden-foo',
    identifier: '2',
  }),
  getTerminal({
    target: 'shoot',
    namespace: 'garden-foo',
    identifier: '3',
    preferredHost: 'shoot',
  }),
]

function getTerminal (options = {}) {
  const {
    target,
    namespace,
    identifier,
    createdBy = 'admin@example.org',
    preferredHost = 'seed',
    image = 'fooImage:0.1.2',
  } = options
  const generateName = `term-${target}-`
  const name = generateName + padStart(identifier, 5, '0')
  return {
    metadata: {
      namespace,
      generateName,
      name,
      annotations: {
        'gardener.cloud/created-by': createdBy,
        'dashboard.gardener.cloud/identifier': identifier,
        'dashboard.gardener.cloud/preferredHost': preferredHost,
      },
      labels: {
        'dashboard.gardener.cloud/created-by-hash': hash(createdBy),
        'dashboard.gardener.cloud/identifier-hash': hash(identifier),
      },
      uid: identifier,
    },
    spec: {
      host: {
        temporaryNamespace: true,
        namespace: 'term-host-' + identifier,
        credentials: {
          shootRef: {
            namespace: 'garden',
            name: 'host',
          },
        },
        pod: {
          container: {
            image,
          },
        },
      },
      target: {},
    },
    status: {
      attachServiceAccountName: 'term-attach-' + identifier,
      podName: 'term-' + identifier,
    },
  }
}

const terminals = {
  create (options) {
    return getTerminal(options)
  },
  get (namespace, name) {
    const items = terminals.list(namespace)
    return find(items, ['metadata.name', name])
  },
  list (namespace, { labelSelector } = {}) {
    let items = cloneDeep(terminalList)
    if (namespace) {
      items = filter(items, ['metadata.namespace', namespace])
    }
    if (!isEmpty(labelSelector)) {
      items = filter(items, ['metadata.labels', labelSelector])
    }
    return items
  },
}

const matchOptions = { decode: decodeURIComponent }
const matchList = pathToRegexp.match('/apis/dashboard.gardener.cloud/v1alpha1/namespaces/:namespace/terminals', matchOptions)
const matchItem = pathToRegexp.match('/apis/dashboard.gardener.cloud/v1alpha1/namespaces/:namespace/terminals/:name', matchOptions)

const mocks = {
  list () {
    return headers => {
      const [pathname] = split(headers[':path'], '?')
      const matchResult = matchList(pathname)
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { namespace } = {} } = matchResult

      const labelSelector = parseLabelSelector(headers)
      const items = terminals.list(namespace, { labelSelector })
      return Promise.resolve({ items })
    }
  },
  create ({ resourceVersion = '42' } = {}) {
    return (headers, json) => {
      const matchResult = matchList(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { namespace } = {} } = matchResult
      const item = cloneDeep(json)
      const identifier = get(item, ['metadata', 'annotations', 'dashboard.gardener.cloud/identifier'], '21')
      const generateName = get(item, ['metadata', 'generateName'])
      if (generateName) {
        set(item, ['metadata', 'name'], generateName + padStart(identifier, 5, '0'))
      }
      const temporaryNamespace = get(item, ['spec', 'host', 'temporaryNamespace'])
      if (temporaryNamespace) {
        set(item, ['spec', 'host', 'namespace'], 'term-host-' + identifier)
      }
      set(item, ['metadata', 'namespace'], namespace)
      set(item, ['metadata', 'resourceVersion'], resourceVersion)
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
      const items = filter(terminals.list(namespace), fieldSelector)
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
      const item = terminals.get(namespace, name)
      if (item) {
        return Promise.resolve(item)
      }
      return Promise.reject(createError(404))
    }
  },
  patch () {
    return (headers, json) => {
      const matchResult = matchItem(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { namespace, name } = {} } = matchResult
      const item = terminals.get(namespace, name)
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
      const item = terminals.get(namespace, name)
      return Promise.resolve(item)
    }
  },
}

module.exports = {
  ...terminals,
  mocks,
}
