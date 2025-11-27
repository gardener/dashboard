//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const yaml = require('js-yaml')
const { cloneDeep, merge, find, filter, has, get, set, mapValues, split, startsWith, endsWith, isEmpty } = require('lodash')
const createError = require('http-errors')
const pathToRegexp = require('path-to-regexp')
const { toBase64, createUrl } = require('./helper')

function getSecret ({ namespace, name, labels, creationTimestamp, data = {} }) {
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

  if (!isEmpty(data)) {
    data = mapValues(data, toBase64)
  }
  return { metadata, data }
}

function getCloudProviderSecret ({ ...options }) {
  return getSecret({
    ...options,
  })
}

const cloudProviderSecretList = [
  getCloudProviderSecret({
    namespace: 'garden-foo',
    name: 'secret1',
    data: {
      key: 'fooKey',
      secret: 'fooSecret',
    },
  }),
  getCloudProviderSecret({
    namespace: 'garden-foo',
    name: 'secret2',
    data: {
      key: 'fooKey',
      secret: 'fooSecret',
    },
  }),
  getCloudProviderSecret({
    namespace: 'garden-foo',
    name: 'secret3',
    labels: { 'provider.shoot.gardener.cloud/aws': 'true' }, // will appear in list
    data: {
      key: 'fooKey',
      secret: 'fooSecret',
    },
  }),
  getCloudProviderSecret({
    namespace: 'garden-foo',
    name: 'dns-secret',
    labels: { 'dashboard.gardener.cloud/dnsProviderType': 'aws-route53' }, // will appear in list
    data: {
      key: 'fooKey',
      secret: 'fooSecret',
    },
  }),
  getCloudProviderSecret({
    namespace: 'garden-trial',
    name: 'trial-secret',
    data: {
      key: 'trialKey',
      secret: 'trialSecret',
    },
  }),
]

const secrets = {
  create (options) {
    return getSecret(options)
  },
  get (namespace, name) {
    const items = secrets.list(namespace)
    return find(items, ['metadata.name', name])
  },
  list (namespace) {
    const items = cloneDeep(cloudProviderSecretList)
    return namespace
      ? filter(items, ['metadata.namespace', namespace])
      : items
  },
  getTerminalShortcutsSecret (namespace, options = {}) {
    const {
      valid = false,
      invalid = false,
      target = 'cp',
    } = options
    const shortcuts = []
    if (valid) {
      shortcuts.push({
        title: 'title',
        description: 'description',
        target,
        container: {
          image: 'image:latest',
          command: ['cmd'],
          args: ['a', 'b'],
        },
      })
    }
    if (invalid) {
      shortcuts.push({
        invalidShortcut: 'foo',
      })
    }
    if (shortcuts.length) {
      return getSecret({
        name: 'terminal.shortcuts',
        namespace,
        data: {
          shortcuts: yaml.dump(shortcuts),
        },
      })
    }
  },
  getMonitoringSecret (namespace, name, creationTimestamp) {
    return getSecret({
      name,
      namespace,
      creationTimestamp,
      data: {
        username: `user-${namespace}-${name}`,
        password: `pass-${namespace}-${name}`,
      },
    })
  },
  getServiceAccountSecret (namespace, name) {
    return getSecret({
      name,
      namespace,
      data: {
        namespace,
        token: name,
      },
    })
  },
}

const matchOptions = { decode: decodeURIComponent }
const matchList = pathToRegexp.match('/api/v1/namespaces/:namespace/secrets', matchOptions)
const matchItem = pathToRegexp.match('/api/v1/namespaces/:namespace/secrets/:name', matchOptions)

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
        const items = secrets.list(namespace)
        return Promise.resolve({ items })
      }

      return Promise.reject(createError(503))
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
      set(item, ['metadata', 'namespace'], namespace)
      set(item, ['metadata', 'resourceVersion'], resourceVersion)
      return Promise.resolve(item)
    }
  },
  get (options) {
    return headers => {
      const matchResult = matchItem(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { namespace, name } = {} } = matchResult
      const [hostname] = split(headers[':authority'], ':')
      if (hostname === 'kubernetes') {
        if (/-token-[a-f0-9]{5}$/.test(name)) {
          const item = secrets.getServiceAccountSecret(namespace, name)
          return Promise.resolve(item)
        }
        if (name === 'terminal.shortcuts') {
          const item = secrets.getTerminalShortcutsSecret(namespace, options)
          if (item) {
            return Promise.resolve(item)
          }
        }
        const item = secrets.get(namespace, name)
        if (item) {
          return Promise.resolve(item)
        }

        if (endsWith(name, '.monitoring')) {
          const item = secrets.getMonitoringSecret(namespace, name)
          return Promise.resolve(item)
        }
      } else if (endsWith(hostname, 'shoot.cluster')) {
        if (startsWith(namespace, 'term-host-') && /-token-[a-f0-9]{5}$/.test(name)) {
          const item = secrets.getServiceAccountSecret(namespace, name)
          return Promise.resolve(item)
        }
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
      if (has(json, ['metadata', 'resourceVersion'])) {
        return Promise.reject(createError(409))
      }
      const item = secrets.get(namespace, name)
      if (!item) {
        return Promise.reject(createError(404))
      }
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
      const item = secrets.get(namespace, name)
      return Promise.resolve(item)
    }
  },
}

module.exports = {
  ...secrets,
  mocks,
}
