//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { cloneDeep, map, find, filter, set } = require('lodash')
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
      name: 'secret1'
    },
    quotas
  }),
  getSecretBinding({
    namespace: 'garden-foo',
    name: 'foo-infra3',
    cloudProfileName: 'infra3-profileName',
    secretRef: {
      namespace: 'garden-foo',
      name: 'secret2'
    },
    quotas
  }),
  getSecretBinding({
    namespace: 'garden-foo',
    name: 'trial-infra1',
    cloudProfileName: 'infra1-profileName',
    secretRef: {
      namespace: 'garden-trial',
      name: 'trial-secret'
    },
    quotas
  })
]

function getSecretBinding ({ namespace, name, cloudProfileName, secretRef = {}, quotas = [] }) {
  return {
    kind: 'SecretBinding',
    metadata: {
      name,
      namespace,
      labels: {
        'cloudprofile.garden.sapcloud.io/name': cloudProfileName
      }
    },
    secretRef,
    quotas
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
  }
}

const mocks = {
  list () {
    const path = '/apis/core.gardener.cloud/v1beta1/namespaces/:namespace/secretbindings'
    const match = pathToRegexp.match(path, { decode: decodeURIComponent })
    return headers => {
      const { params: { namespace } = {} } = match(headers[':path']) || {}
      const items = filter(secretBindingList, ['metadata.namespace', namespace])
      return Promise.resolve({ items })
    }
  },
  create ({ resourceVersion = '42' } = {}) {
    const path = '/apis/core.gardener.cloud/v1beta1/namespaces/:namespace/secretbindings'
    const match = pathToRegexp.match(path, { decode: decodeURIComponent })
    return (headers, json) => {
      const { params: { namespace } = {} } = match(headers[':path']) || {}
      const item = cloneDeep(json)
      set(item, 'metadata.namespace', namespace)
      set(item, 'metadata. resourceVersion', resourceVersion)
      return Promise.resolve(item)
    }
  },
  get () {
    const path = '/apis/core.gardener.cloud/v1beta1/namespaces/:namespace/secretbindings/:name'
    const match = pathToRegexp.match(path, { decode: decodeURIComponent })
    return headers => {
      const { params: { namespace, name } = {} } = match(headers[':path']) || {}
      const item = secretBindings.get(namespace, name)
      return Promise.resolve(item)
    }
  },
  delete () {
    const path = '/apis/core.gardener.cloud/v1beta1/namespaces/:namespace/secretbindings/:name'
    const match = pathToRegexp.match(path, { decode: decodeURIComponent })
    return headers => {
      const { params: { namespace, name } = {} } = match(headers[':path']) || {}
      const item = secretBindings.get(namespace, name)
      return Promise.resolve(item)
    }
  }
}

module.exports = {
  ...secretBindings,
  mocks
}
