//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { cloneDeep, filter, find } = require('lodash')

function getQuota ({
  name,
  namespace = 'garden-trial',
  scope = {
    apiVersion: 'v1',
    kind: 'Secret',
  },
  clusterLifetimeDays = 14,
  cpu = '200',
  uid,
}) {
  uid = uid || `${namespace}--${name}`
  return {
    metadata: {
      name,
      namespace,
      uid,
    },
    spec: {
      scope,
      clusterLifetimeDays,
      metrics: {
        cpu,
      },
    },
  }
}

const quotaList = [
  getQuota({ uid: 1, name: 'trial-secret-quota', namespace: 'garden-trial' }),
  getQuota({ uid: 2, name: 'foo-quota1', namespace: 'garden-foo' }),
  getQuota({ uid: 3, name: 'foo-quota2', namespace: 'garden-foo' }),
]

const quotas = {
  create (options) {
    return getQuota(options)
  },
  get (namespace, name) {
    const items = quotas.list(namespace)
    return find(items, ['metadata.name', name])
  },
  list (namespace) {
    const items = cloneDeep(quotaList)
    return namespace
      ? filter(items, ['metadata.namespace', namespace])
      : items
  },
}

module.exports = {
  ...quotas,
}
