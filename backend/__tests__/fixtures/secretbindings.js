//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  cloneDeep,
  map,
  find,
  filter,
} from 'lodash-es'
import createError from 'http-errors'
import pathToRegexp from 'path-to-regexp'

import quotas from './quotas.js'

const quotaList = quotas.list('garden-foo')
const quotaRefs = map(quotaList, ({ metadata: { namespace, name } }) => ({ namespace, name }))

const cloudProviderBindingList = [
  getSecretBinding({
    namespace: 'garden-foo',
    name: 'foo-infra1-secret1-secretbinding',
    provider: 'infra1',
    secretRef: {
      namespace: 'garden-foo',
      name: 'secret1',
    },
    quotas: quotaRefs,
  }),
  getSecretBinding({
    namespace: 'garden-foo',
    name: 'foo-infra3-secret2-secretbinding',
    provider: 'infra3',
    secretRef: {
      namespace: 'garden-foo',
      name: 'secret2',
    },
    quotas: quotaRefs,
  }),
  getSecretBinding({
    namespace: 'garden-foo',
    name: 'trial-infra1',
    provider: 'infra1',
    secretRef: {
      namespace: 'garden-trial',
      name: 'trial-secret',
    },
    quotas: quotaRefs,
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

export default {
  ...secretBindings,
  mocks,
}
