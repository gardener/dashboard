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

const cloudProviderBindingList = [
  getCredentialsBinding({
    namespace: 'garden-foo',
    name: 'foo-infra1-secret1-credentialsbinding',
    provider: 'infra1',
    credentialsRef: {
      kind: 'Secret',
      namespace: 'garden-foo',
      name: 'secret1',
    },
    quotas,
  }),
  getCredentialsBinding({
    namespace: 'garden-foo',
    name: 'foo-infra3-secret3-credentialsbinding',
    provider: 'infra3',
    credentialsRef: {
      kind: 'Secret',
      namespace: 'garden-foo',
      name: 'secret3',
    },
    quotas,
  }),
  getCredentialsBinding({
    namespace: 'garden-foo',
    name: 'trial-infra1',
    provider: 'infra1',
    credentialsRef: {
      kind: 'Secret',
      namespace: 'garden-trial',
      name: 'trial-secret',
    },
    quotas,
  }),
  getCredentialsBinding({
    namespace: 'garden-foo',
    name: 'foo-wlid1',
    provider: 'infra1',
    credentialsRef: {
      kind: 'WorkloadIndentity',
      namespace: 'garden-foo',
      name: 'wl-foo-infra1',
    },
    quotas,
  },
  ),
]

function getCredentialsBinding ({ namespace, name, provider, credentialsRef = {}, quotas = [] }) {
  return {
    kind: 'CredentialsBinding',
    metadata: {
      name,
      namespace,
    },
    provider,
    credentialsRef,
    quotas,
  }
}

const credentialsBindings = {
  create (options) {
    return getCredentialsBinding(options)
  },
  get (namespace, name) {
    const items = credentialsBindings.list(namespace)
    return find(items, ['metadata.name', name])
  },
  list (namespace) {
    const items = cloneDeep(cloudProviderBindingList)
    return namespace
      ? filter(items, ['metadata.namespace', namespace])
      : items
  },
}

const matchOptions = { decode: decodeURIComponent }
const matchList = pathToRegexp.match('/apis/security.gardener.cloud/v1alpha1/namespaces/:namespace/credentialsbindings', matchOptions)
const matchItem = pathToRegexp.match('/apis/security.gardener.cloud/v1alpha1/namespaces/:namespace/credentialsbindings/:name', matchOptions)

const mocks = {
  list () {
    return headers => {
      const matchResult = matchList(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { namespace } = {} } = matchResult
      const items = filter(cloudProviderBindingList, ['metadata.namespace', namespace])
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
      set(item, ['metadata', 'resourceVersion'], resourceVersion)
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
      const item = credentialsBindings.get(namespace, name)
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
      const item = credentialsBindings.get(namespace, name)
      return Promise.resolve(item)
    }
  },
}

module.exports = {
  ...credentialsBindings,
  mocks,
}
