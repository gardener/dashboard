//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const createError = require('http-errors')
const pathToRegexp = require('path-to-regexp')
const { cloneDeep, find, merge } = require('lodash')
const { POD_NAME, POD_NAMESPACE } = require('./env')

const getLease = (renewTime = null) => {
  if (!renewTime) {
    renewTime = '1970-01-01T00:00:00.000000Z'
  } else {
    if (renewTime instanceof Date) {
      renewTime = `${renewTime.toISOString().slice(0, -1)}000Z`
    }
  }

  return {
    metadata: {
      namespace: POD_NAMESPACE,
      name: 'gardener-dashboard-github-webhook',
    },
    spec: {
      holderIdentity: POD_NAME,
      renewTime,
    },
  }
}

const leaseList = [getLease(new Date())]

const leases = {
  items: [...leaseList],
  list () {
    return cloneDeep(this.items)
  },
  get (namespace, name) {
    return find(leases.list(), { metadata: { namespace, name } })
  },
}

const matchOptions = { decode: decodeURIComponent }
const matchList = pathToRegexp.match('/apis/coordination.k8s.io/v1/namespaces/:namespace/leases', matchOptions)
const matchItem = pathToRegexp.match('/apis/coordination.k8s.io/v1/namespaces/:namespace/leases/:name', matchOptions)

const mocks = {
  mergePatch () {
    return (headers, body) => {
      const matchResult = matchItem(headers[':path'])
      if (headers[':method'] !== 'patch') {
        return Promise.reject(createError(405))
      }
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { namespace, name } = matchResult.params
      const item = leases.get(namespace, name)
      if (!item) {
        return Promise.reject(createError(404))
      }

      return Promise.resolve(merge(item, body))
    }
  },
  list () {
    return headers => {
      const matchResult = matchList(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const items = leases.list()
      return Promise.resolve({ items })
    }
  },
  get () {
    return headers => {
      const matchResult = matchItem(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { name } = {} } = matchResult
      const item = leases.get(name)
      return Promise.resolve(item)
    }
  },
}

module.exports = {
  ...leases,
  mocks,
}
