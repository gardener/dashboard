//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { cloneDeep, map, find, filter } = require('lodash')
const createError = require('http-errors')
const pathToRegexp = require('path-to-regexp')

const quotaList = require('./quotas').list('garden-foo')
const quotas = map(quotaList, ({ metadata: { namespace, name } }) => ({ namespace, name }))

const cloudProviderBindingList = [
  getSecretBinding({
    namespace: 'garden-foo',
    name: 'foo-infra1-secret1-secretbinding',
    provider: 'infra1',
    secretRef: {
      namespace: 'garden-foo',
      name: 'secret1',
    },
    quotas,
  }),
  getSecretBinding({
    namespace: 'garden-foo',
    name: 'foo-infra3-secret2-secretbinding',
    provider: 'infra3',
    secretRef: {
      namespace: 'garden-foo',
      name: 'secret2',
    },
    quotas,
  }),
  getSecretBinding({
    namespace: 'garden-foo',
    name: 'trial-infra1',
    provider: 'infra1',
    secretRef: {
      namespace: 'garden-trial',
      name: 'trial-secret',
    },
    quotas,
  }),
  getSecretBinding({
    namespace: 'garden-foo',
    name: 'dns-aws-route53-secretbinding',
    provider: 'aws-route53',
    secretRef: {
      namespace: 'garden-foo',
      name: 'dns-secret',
    },
  }),
]

function getSecretBinding ({ namespace, name, provider, secretRef = {}, quotas = [] }) {
  return {
    kind: 'SecretBinding',
    metadata: {
      name,
      namespace,
    },
    provider,
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
    const items = cloneDeep(cloudProviderBindingList)
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
      const items = filter(cloudProviderBindingList, ['metadata.namespace', namespace])
      return Promise.resolve({ items })
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
