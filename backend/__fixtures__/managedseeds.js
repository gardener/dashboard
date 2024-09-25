//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { filter, find, cloneDeep } = require('lodash')
const createError = require('http-errors')
const pathToRegexp = require('path-to-regexp')

const managedSeedList = [
  getManagedSeed({
    uid: 4,
    name: 'infra1-seed',
    namespace: 'garden',
    project: 'garden',
    createdBy: 'admin@example.org',
    secretBindingName: 'soil-infra1',
    seed: 'soil-infra1',
  }),
]

function getManagedSeed ({
  name,
  uid,
  shootName,
}) {
  const namespace = 'garden'
  uid = uid || `${namespace}--${name}`
  shootName ??= name

  return {
    metadata: {
      uid,
      name,
      namespace,
    },
    spec: {
      shoot: {
        name: shootName,
      },
    },
    status: {},
  }
}

const managedSeeds = {
  create (options) {
    return getManagedSeed(options)
  },
  get (namespace, name) {
    const items = managedSeeds.list(namespace)
    return find(items, ['metadata.name', name])
  },
  list (namespace) {
    const items = cloneDeep(managedSeedList)
    return namespace
      ? filter(items, ['metadata.namespace', namespace])
      : items
  },
}

const matchOptions = { decode: decodeURIComponent }
const matchItem = pathToRegexp.match('/apis/seedmanagement.gardener.cloud/v1alpha1/namespaces/:namespace/managedseeds/:name', matchOptions)

const mocks = {
  get () {
    return headers => {
      const matchResult = matchItem(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { namespace, name } = {} } = matchResult
      const item = managedSeeds.get(namespace, name)
      if (!item) {
        return Promise.reject(createError(404, `ManagedSeed ${namespace}/${name} not found`))
      }
      return Promise.resolve(item)
    }
  },
}

module.exports = {
  ...managedSeeds,
  mocks,
}
