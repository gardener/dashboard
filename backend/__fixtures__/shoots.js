//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { filter, find } = require('lodash')
const createError = require('http-errors')
const pathToRegexp = require('path-to-regexp')
const { cloneDeepAndSetUid } = require('./helper')

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

const shootList = [
  getShoot({
    name: 'fooShoot',
    namespace: 'garden-foo',
    project: 'foo',
    createdBy: 'foo@example.org',
    purpose: 'fooPurpose',
    secretBindingName: 'foo-infra1'
  }),
  getShoot({
    name: 'barShoot',
    namespace: 'garden-foo',
    project: 'foo',
    createdBy: 'bar@example.org',
    purpose: 'barPurpose',
    secretBindingName: 'foo-infra1'
  }),
  getShoot({
    name: 'dummyShoot',
    namespace: 'garden-foo',
    project: 'foo',
    createdBy: 'foo@example.org',
    purpose: 'fooPurpose',
    secretBindingName: 'barSecretName',
    seed: 'infra4-seed-without-secretRef'
  })
]

module.exports = {
  create (...args) {
    return getShoot(...args)
  },
  list () {
    return cloneDeepAndSetUid(shootList)
  },
  mocks: {
    list () {
      const path = '/apis/core.gardener.cloud/v1beta1/namespaces/:namespace/shoots'
      const match = pathToRegexp.match(path, { decode: decodeURIComponent })
      return headers => {
        const { params: { namespace } = {} } = match(headers[':path']) || {}
        const items = filter(shootList, ['metadata.namespace', namespace])
        return Promise.resolve({ items })
      }
    },
    get () {
      const path = '/apis/core.gardener.cloud/v1beta1/namespaces/:namespace/shoots/:name'
      const match = pathToRegexp.match(path, { decode: decodeURIComponent })
      return headers => {
        const { params: { namespace, name } = {} } = match(headers[':path']) || {}
        const item = find(shootList, { metadata: { namespace, name } })
        if (item) {
          return Promise.resolve(item)
        }
        return Promise.reject(createError(404))
      }
    }
  }
}
