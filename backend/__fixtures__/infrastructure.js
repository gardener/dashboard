//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { cloneDeep, find, filter, has, set, chain } = require('lodash')
const createError = require('http-errors')
const pathToRegexp = require('path-to-regexp')

const quotaList = require('./quotas').list()
const quotas = chain(quotaList)
  .filter(['metadata.namespace', 'garden-foo'])
  .map('metadata')
  .value()

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

const infrastructureSecretList = [
  getInfrastructureSecret({
    namespace: 'garden-foo',
    name: 'secret1',
    cloudProfileName: 'infra1-profileName',
    data: {
      key: 'fooKey',
      secret: 'fooSecret'
    }
  }),
  getInfrastructureSecret({
    namespace: 'garden-foo',
    name: 'secret2',
    cloudProfileName: 'infra3-profileName',
    data: {
      key: 'fooKey',
      secret: 'fooSecret'
    }
  }),
  getInfrastructureSecret({
    namespace: 'garden-trial',
    name: 'trial-secret',
    cloudProfileName: 'infra1-profileName',
    data: {
      key: 'trialKey',
      secret: 'trialSecret'
    }
  })
]

function getSecretBinding ({ namespace, name, cloudProfileName, secretRef = {}, quotas = [] }) {
  const secretBinding = {
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

  return secretBinding
}

function getInfrastructureSecret ({ namespace, name, cloudProfileName, data = {} }) {
  return {
    metadata: {
      name,
      namespace,
      labels: {
        'cloudprofile.garden.sapcloud.io/name': cloudProfileName
      }
    },
    data
  }
}

const secrets = {
  create (options) {
    return getInfrastructureSecret(options)
  },
  get (namespace, name) {
    return find(this.list(), { metadata: { namespace, name } })
  },
  list () {
    return cloneDeep(infrastructureSecretList)
  },
  mocks: {
    list () {
      const path = '/api/v1/namespaces/:namespace/secrets'
      const match = pathToRegexp.match(path, { decode: decodeURIComponent })
      return headers => {
        const { params: { namespace } = {} } = match(headers[':path']) || {}
        const items = filter(infrastructureSecretList, ['metadata.namespace', namespace])
        return Promise.resolve({ items })
      }
    },
    create ({ resourceVersion = '42' } = {}) {
      const path = '/api/v1/namespaces/:namespace/secrets'
      const match = pathToRegexp.match(path, { decode: decodeURIComponent })
      return (headers, json) => {
        const { params: { namespace } = {} } = match(headers[':path']) || {}
        const item = cloneDeep(json)
        set(item, 'metadata.namespace', namespace)
        set(item, 'metadata.resourceVersion', resourceVersion)
        return Promise.resolve(item)
      }
    },
    get () {
      const path = '/api/v1/namespaces/:namespace/secrets/:name'
      const match = pathToRegexp.match(path, { decode: decodeURIComponent })
      return headers => {
        const { params: { namespace, name } = {} } = match(headers[':path']) || {}
        const item = secrets.get(namespace, name)
        return Promise.resolve(item)
      }
    },
    patch ({ resourceVersion = '43' } = {}) {
      const path = '/api/v1/namespaces/:namespace/secrets/:name'
      const match = pathToRegexp.match(path, { decode: decodeURIComponent })
      return (headers, json) => {
        if (has(json, 'metadata.resourceVersion')) {
          return Promise.reject(createError(409))
        }
        const { params: { namespace, name } = {} } = match(headers[':path']) || {}
        const item = secrets.get(namespace, name)
        set(item, 'metadata.resourceVersion', resourceVersion)
        return Promise.resolve(item)
      }
    },
    delete () {
      const path = '/api/v1/namespaces/:namespace/secrets/:name'
      const match = pathToRegexp.match(path, { decode: decodeURIComponent })
      return headers => {
        const { params: { namespace, name } = {} } = match(headers[':path']) || {}
        const item = secrets.get(namespace, name)
        return Promise.resolve(item)
      }
    }
  }
}

const secretBindings = {
  create (options) {
    return getSecretBinding(options)
  },
  get (namespace, name) {
    return find(this.list(), { metadata: { namespace, name } })
  },
  list () {
    return cloneDeep(secretBindingList)
  },
  mocks: {
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
    get (options) {
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
}

module.exports = {
  secrets,
  secretBindings
}
