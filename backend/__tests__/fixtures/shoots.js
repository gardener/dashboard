//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  filter,
  find,
  cloneDeep,
  merge,
  get,
  set,
} from 'lodash-es'
import createError from 'http-errors'
import pathToRegexp from 'path-to-regexp'
import { applyPatch } from 'fast-json-patch'

import { getTokenPayload } from './auth.js'
import projects from './projects.js'
import {
  createTestKubeconfig,
  formatTime,
  toBase64,
} from './helper.js'

const shootList = [
  getShoot({
    uid: 1,
    name: 'fooShoot',
    namespace: 'garden-foo',
    project: 'foo',
    createdBy: 'foo@example.org',
    purpose: 'fooPurpose',
    secretBindingName: 'foo-infra1',
  }),
  getShoot({
    uid: 2,
    name: 'barShoot',
    namespace: 'garden-foo',
    project: 'foo',
    createdBy: 'bar@example.org',
    purpose: 'barPurpose',
  }),
  getShoot({
    uid: 3,
    name: 'dummyShoot',
    namespace: 'garden-foo',
    project: 'foo',
    createdBy: 'foo@example.org',
    purpose: 'fooPurpose',
    secretBindingName: 'barSecretName',
    seed: 'infra1-seed',
    advertisedAddresses: null,
  }),
  getShoot({
    uid: 4,
    name: 'infra1-seed',
    namespace: 'garden',
    project: 'garden',
    createdBy: 'admin@example.org',
    secretBindingName: 'soil-infra1',
    seed: 'soil-infra1',
  }),
]

function getShoot ({
  namespace,
  name,
  uid,
  project,
  createdBy,
  purpose = 'foo-purpose',
  kind = 'fooInfra',
  cloudProfileRef = {
    name: 'infra1-profileName',
    kind: 'CloudProfile',
  },
  region = 'foo-west',
  secretBindingName,
  credentialsBindingName = 'foo-credentials',
  seed = 'infra1-seed',
  hibernation = { enabled: false },
  kubernetesVersion = '1.16.0',
  advertisedAddresses,
}) {
  uid = uid || `${namespace}--${name}`
  const shoot = {
    metadata: {
      uid,
      name,
      namespace,
      annotations: {},
    },
    spec: {
      cloudProfile: cloudProfileRef,
      region,
      hibernation,
      provider: {
        type: kind,
      },
      seedName: seed,
      kubernetes: {
        version: kubernetesVersion,
      },
      purpose,
    },
    status: {},
  }
  if (secretBindingName) {
    shoot.spec.secretBindingName = secretBindingName
  }
  if (credentialsBindingName) {
    shoot.spec.credentialsBindingName = credentialsBindingName
  }
  if (createdBy) {
    shoot.metadata.annotations['gardener.cloud/created-by'] = createdBy
  }
  if (project) {
    shoot.status.technicalID = `shoot--${project}--${name}`
  }
  if (advertisedAddresses !== null) {
    shoot.status.advertisedAddresses = advertisedAddresses ?? [{
      name: 'external',
      url: `https://api.${name}.${project}.shoot.test`,
    }]
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
  getByUid (uid) {
    return find(shootList, ['metadata.uid', uid])
  },
  list (namespace) {
    const items = cloneDeep(shootList)
    return namespace
      ? filter(items, ['metadata.namespace', namespace])
      : items
  },
}

const matchOptions = { decode: decodeURIComponent }
const matchListAllNamespaces = pathToRegexp.match('/apis/core.gardener.cloud/v1beta1/shoots', matchOptions)
const matchList = pathToRegexp.match('/apis/core.gardener.cloud/v1beta1/namespaces/:namespace/shoots', matchOptions)
const matchItem = pathToRegexp.match('/apis/core.gardener.cloud/v1beta1/namespaces/:namespace/shoots/:name', matchOptions)
const matchAdminKubeconfig = pathToRegexp.match('/apis/core.gardener.cloud/v1beta1/namespaces/:namespace/shoots/:name/adminkubeconfig', matchOptions)
const matchBinding = pathToRegexp.match('/apis/core.gardener.cloud/v1beta1/namespaces/:namespace/shoots/:name/binding', matchOptions)

const mocks = {
  list () {
    return headers => {
      const matchResult = matchList(headers[':path']) || matchListAllNamespaces(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { namespace } = {} } = matchResult
      if (namespace) {
        const payload = getTokenPayload(headers)
        const project = projects.getByNamespace(namespace)
        if (!projects.isMember(project, payload)) {
          return Promise.reject(createError(403))
        }
      }
      const items = shoots.list(namespace)
      return Promise.resolve({ items })
    }
  },
  create ({ uid = 21, resourceVersion = '42', phase = 'Ready' } = {}) {
    return (headers, json) => {
      const matchResult = matchList(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { namespace } = {} } = matchResult
      const payload = getTokenPayload(headers)
      const project = projects.getByNamespace(namespace)
      if (!projects.isMember(project, payload)) {
        return Promise.reject(createError(403))
      }
      const item = cloneDeep(json)
      const name = item.metadata.name
      set(item, ['metadata', 'namespace'], namespace)
      set(item, ['metadata', 'resourceVersion'], resourceVersion)
      set(item, ['metadata', 'uid'], uid)
      set(item, ['metadata', 'annotations', 'gardener.cloud/created-by'], payload.id)
      set(item, ['status', 'technicalID'], `shoot--${project.metadata.name}--${name}`)
      return Promise.resolve(item)
    }
  },
  createAdminKubeconfigRequest ({
    user = {
      'client-certificate-data': toBase64('certificate-authority-data'),
      'client-key-data': toBase64('client-key-data'),
    }, cluster = { server: 'https://shootApiServerHostname:6443' },
  } = {}) {
    return (headers, json) => {
      const matchResult = matchAdminKubeconfig(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { namespace, name } = {} } = matchResult
      const item = cloneDeep(json)
      const expirationSeconds = get(item, ['spec', 'expirationSeconds'], 600)
      set(item, ['metadata', 'namespace'], namespace)
      set(item, ['metadata', 'name'], name)
      set(item, ['status', 'kubeconfig'], createTestKubeconfig(user, cluster))
      set(item, ['status', 'expirationTimestamp'], formatTime(
        new Date().setSeconds(new Date().getSeconds() + expirationSeconds)),
      )
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
    return (headers, json) => {
      const matchResult = matchItem(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { namespace, name } = {} } = matchResult
      let item = shoots.get(namespace, name)
      if (!item) {
        return Promise.reject(createError(404))
      }
      const resourceVersion = get(item, ['metadata', 'resourceVersion'], '42')
      switch (headers['content-type']) {
        case 'application/json-patch+json':
          item = applyPatch(item, json).newDocument
          break
        default:
          merge(item, json)
          break
      }
      set(item, ['metadata', 'resourceVersion'], (+resourceVersion + 1).toString())
      return Promise.resolve(item)
    }
  },
  put () {
    return (headers, json) => {
      const matchResult = matchItem(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { namespace, name } = {} } = matchResult
      let item = shoots.get(namespace, name)
      if (!item) {
        return Promise.reject(createError(404))
      }
      const resourceVersion = get(item, ['metadata', 'resourceVersion'], '42')
      item = cloneDeep(json)
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
      const item = shoots.get(namespace, name)
      set(item, ['metadata', 'annotations', 'confirmation.gardener.cloud/deletion'], 'true')
      return Promise.resolve(item)
    }
  },
  patchBinding () {
    return (headers, json) => {
      const matchResult = matchBinding(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { namespace, name } = {} } = matchResult
      let item = shoots.get(namespace, name)
      if (!item) {
        return Promise.reject(createError(404))
      }

      item = applyPatch(item, json).newDocument

      return Promise.resolve(item)
    }
  },
}

export default {
  ...shoots,
  mocks,
}
