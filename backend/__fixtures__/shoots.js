//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { filter, find, cloneDeep, merge, get, set } = require('lodash')
const createError = require('http-errors')
const pathToRegexp = require('path-to-regexp')
const { applyPatch } = require('fast-json-patch')

const { getTokenPayload } = require('./auth')
const projects = require('./projects')

const shootList = [
  getShoot({
    uid: 1,
    name: 'fooShoot',
    namespace: 'garden-foo',
    project: 'foo',
    createdBy: 'foo@example.org',
    purpose: 'fooPurpose',
    secretBindingName: 'foo-infra1'
  }),
  getShoot({
    uid: 2,
    name: 'barShoot',
    namespace: 'garden-foo',
    project: 'foo',
    createdBy: 'bar@example.org',
    purpose: 'barPurpose',
    secretBindingName: 'foo-infra1'
  }),
  getShoot({
    uid: 3,
    name: 'dummyShoot',
    namespace: 'garden-foo',
    project: 'foo',
    createdBy: 'foo@example.org',
    purpose: 'fooPurpose',
    secretBindingName: 'barSecretName',
    seed: 'infra4-seed-without-secretRef'
  }),
  getShoot({
    uid: 4,
    name: 'infra1-seed',
    namespace: 'garden',
    project: 'garden',
    createdBy: 'admin@example.org',
    secretBindingName: 'soil-infra1',
    seed: 'soil-infra1'
  })
]

function getShoot ({
  namespace,
  name,
  uid,
  project,
  createdBy,
  purpose = 'foo-purpose',
  kind = 'fooInfra',
  profile = 'infra1-profileName',
  region = 'foo-west',
  secretBindingName = 'foo-secret',
  seed = 'infra1-seed',
  hibernation = { enabled: false },
  kubernetesVersion = '1.16.0'
}) {
  uid = uid || `${namespace}--${name}`
  const shoot = {
    metadata: {
      uid,
      name,
      namespace,
      annotations: {}
    },
    spec: {
      secretBindingName,
      cloudProfileName: profile,
      region,
      hibernation,
      provider: {
        type: kind
      },
      seedName: seed,
      kubernetes: {
        version: kubernetesVersion
      },
      purpose
    },
    status: {}
  }
  if (createdBy) {
    shoot.metadata.annotations['gardener.cloud/created-by'] = createdBy
  }
  if (project) {
    shoot.status.technicalID = `shoot--${project}--${name}`
  }
  return shoot
}

const shoots = {
  create (options) {
    return getShoot(options)
  },
  get (namespace, name) {
    const items = shoots.list(namespace)
    return find(items, ['metadata.name', name])
  },
  list (namespace) {
    const items = cloneDeep(shootList)
    return namespace
      ? filter(items, ['metadata.namespace', namespace])
      : items
  }
}

const mocks = {
  list () {
    const path = '/apis/core.gardener.cloud/v1beta1/namespaces/:namespace/shoots'
    const match = pathToRegexp.match(path, { decode: decodeURIComponent })
    return headers => {
      const { params: { namespace } = {} } = match(headers[':path']) || {}
      const payload = getTokenPayload(headers)
      const project = projects.getByNamespace(namespace)
      if (!projects.isMember(project, payload)) {
        return Promise.reject(createError(403))
      }
      const items = shoots.list(namespace)
      return Promise.resolve({ items })
    }
  },
  create ({ uid = 21, resourceVersion = '42', phase = 'Ready' } = {}) {
    const path = '/apis/core.gardener.cloud/v1beta1/namespaces/:namespace/shoots'
    const match = pathToRegexp.match(path, { decode: decodeURIComponent })
    return (headers, json) => {
      const { params: { namespace } = {} } = match(headers[':path']) || {}
      const payload = getTokenPayload(headers)
      const project = projects.getByNamespace(namespace)
      if (!projects.isMember(project, payload)) {
        return Promise.reject(createError(403))
      }
      const item = cloneDeep(json)
      const name = item.metadata.name
      set(item, 'metadata.namespace', namespace)
      set(item, 'metadata.resourceVersion', resourceVersion)
      set(item, 'metadata.uid', uid)
      set(item, 'metadata.annotations["gardener.cloud/created-by"]', payload.id)
      set(item, 'status.technicalID', `shoot--${project.metadata.name}--${name}`)
      return Promise.resolve(item)
    }
  },
  get () {
    const path = '/apis/core.gardener.cloud/v1beta1/namespaces/:namespace/shoots/:name'
    const match = pathToRegexp.match(path, { decode: decodeURIComponent })
    return headers => {
      const { params: { namespace, name } = {} } = match(headers[':path']) || {}
      const payload = getTokenPayload(headers)
      const project = projects.getByNamespace(namespace)
      if (!projects.isMember(project, payload)) {
        return Promise.reject(createError(403))
      }
      const item = shoots.get(namespace, name)
      if (!item) {
        return Promise.reject(createError(404, `Shoot ${namespace}/${name} not found`))
      }
      return Promise.resolve(item)
    }
  },
  patch () {
    const path = '/apis/core.gardener.cloud/v1beta1/namespaces/:namespace/shoots/:name'
    const match = pathToRegexp.match(path, { decode: decodeURIComponent })
    return (headers, json) => {
      const { params: { namespace, name } = {} } = match(headers[':path']) || {}
      let item = shoots.get(namespace, name)
      if (!item) {
        return Promise.reject(createError(404))
      }
      const resourceVersion = get(item, 'metadata.resourceVersion', '42')
      switch (headers['content-type']) {
        case 'application/json-patch+json':
          item = applyPatch(item, json).newDocument
          break
        default:
          merge(item, json)
          break
      }
      set(item, 'metadata.resourceVersion', (+resourceVersion + 1).toString())
      return Promise.resolve(item)
    }
  },
  put () {
    const path = '/apis/core.gardener.cloud/v1beta1/namespaces/:namespace/shoots/:name'
    const match = pathToRegexp.match(path, { decode: decodeURIComponent })
    return (headers, json) => {
      const { params: { namespace, name } = {} } = match(headers[':path']) || {}
      let item = shoots.get(namespace, name)
      if (!item) {
        return Promise.reject(createError(404))
      }
      const resourceVersion = get(item, 'metadata.resourceVersion', '42')
      item = cloneDeep(json)
      set(item, 'metadata.resourceVersion', (+resourceVersion + 1).toString())
      return Promise.resolve(item)
    }
  },
  delete () {
    const path = '/apis/core.gardener.cloud/v1beta1/namespaces/:namespace/shoots/:name'
    const match = pathToRegexp.match(path, { decode: decodeURIComponent })
    return headers => {
      const { params: { namespace, name } = {} } = match(headers[':path']) || {}
      const item = shoots.get(namespace, name)
      set(item, 'metadata.annotations["confirmation.gardener.cloud/deletion"]', 'true')
      return Promise.resolve(item)
    }
  }
}

module.exports = {
  ...shoots,
  mocks
}
