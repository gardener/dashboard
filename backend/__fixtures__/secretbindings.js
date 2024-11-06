//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { cloneDeep, map, find, filter, set } = require('lodash')
const createError = require('http-errors')
const pathToRegexp = require('path-to-regexp')

const quotaList = require('./quotas').list('garden-foo')
const quotas = map(quotaList, ({ metadata: { namespace, name } }) => ({ namespace, name }))

const secretBindingList = [
  getSecretBinding({
    namespace: 'garden-foo',
    name: 'foo-infra1',
    cloudProfileName: 'infra1-profileName',
    secretRef: {
      namespace: 'garden-foo',
      name: 'secret1',
    },
    quotas,
  }),
  getSecretBinding({
    namespace: 'garden-foo',
    name: 'foo-infra3',
    cloudProfileName: 'infra3-profileName',
    secretRef: {
      namespace: 'garden-foo',
      name: 'secret2',
    },
    quotas,
  }),
  getSecretBinding({
    namespace: 'garden-foo',
    name: 'trial-infra1',
    cloudProfileName: 'infra1-profileName',
    secretRef: {
      namespace: 'garden-trial',
      name: 'trial-secret',
    },
    quotas,
  }),
  getSecretBinding({
    namespace: 'garden-foo',
    name: 'foo-dns1',
    dnsProviderName: 'foo-dns',
    secretRef: {
      namespace: 'garden-foo',
      name: 'secret3',
    },
    quotas,
  }),
]

function getSecretBinding ({ namespace, name, cloudProfileName, dnsProviderName, secretRef = {}, quotas = [] }) {
  const labels = {}
  if (cloudProfileName) {
    labels['cloudprofile.garden.sapcloud.io/name'] = cloudProfileName
  }
  if (dnsProviderName) {
    labels['gardener.cloud/dnsProviderName'] = dnsProviderName
  }
  return {
    kind: 'SecretBinding',
    metadata: {
      name,
      namespace,
      labels,
    },
    secretRef,
    quotas,
  }
}

const secretBindings = {
  create (options) {
    return getSecretBinding(options)
  },
  get (namespace, name) {
    const items = secretBindings.list(namespace)
    return find(items, ['metadata.name', name])
  },
  list (namespace) {
    const items = cloneDeep(secretBindingList)
    return namespace
      ? filter(items, ['metadata.namespace', namespace])
      : items
  },
}

const matchOptions = { decode: decodeURIComponent }
const matchList = pathToRegexp.match('/apis/core.gardener.cloud/v1beta1/namespaces/:namespace/secretbindings', matchOptions)
const matchItem = pathToRegexp.match('/apis/core.gardener.cloud/v1beta1/namespaces/:namespace/secretbindings/:name', matchOptions)

const mocks = {
  list () {
    return headers => {
      const matchResult = matchList(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { namespace } = {} } = matchResult
      const items = filter(secretBindingList, ['metadata.namespace', namespace])
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
      set(item, ['metadata', 'namespace'], namespace)
      set(item, ['metadata', ' resourceVersion'], resourceVersion)
      return Promise.resolve(item)
    }
  },
  get () {
    return headers => {
      const matchResult = matchItem(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { namespace, name } = {} } = matchResult
      const item = secretBindings.get(namespace, name)
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
      const item = secretBindings.get(namespace, name)
      return Promise.resolve(item)
    }
  },
}

module.exports = {
  ...secretBindings,
  mocks,
}
