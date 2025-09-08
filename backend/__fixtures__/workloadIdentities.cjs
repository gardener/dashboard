//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { find, filter } = require('lodash')
const createError = require('http-errors')
const pathToRegexp = require('path-to-regexp')

function getWorkloadIdentity (options) {
  return {
    kind: 'WorkloadIdentity',
    ...options,
  }
}

const workloadIdentitiesList = [
  getWorkloadIdentity({
    metadata: {
      namespace: 'garden-foo',
      name: 'wl-foo-infra1',
    },
    spec: {
      targetSystem: {
        type: 'infra-1',
      },
    },
  }),
]

const matchOptions = { decode: decodeURIComponent }
const matchList = pathToRegexp.match('/apis/security.gardener.cloud/v1alpha1/namespaces/:namespace/workloadidentities', matchOptions)
const matchItem = pathToRegexp.match('/apis/security.gardener.cloud/v1alpha1/namespaces/:namespace/workloadidentities/:name', matchOptions)

const mocks = {
  list () {
    return headers => {
      const matchResult = matchList(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { namespace } = {} } = matchResult
      const items = filter(workloadIdentitiesList, ['metadata.namespace', namespace])
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
      const item = find(workloadIdentitiesList, { 'metadata.namespace': namespace, 'metadata.name': name })
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
      const item = find(workloadIdentitiesList, { 'metadata.namespace': namespace, 'metadata.name': name })
      return Promise.resolve(item)
    }
  },
}

module.exports = {
  ...workloadIdentitiesList,
  mocks,
}
