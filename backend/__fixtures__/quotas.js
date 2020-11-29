//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { cloneDeepAndSetUid } = require('./helper')

function getQuota ({ name, namespace = 'garden-trial', scope = { apiVersion: 'v1', kind: 'Secret' }, clusterLifetimeDays = 14, cpu = '200' }) {
  return {
    metadata: {
      name,
      namespace
    },
    spec: {
      scope,
      clusterLifetimeDays,
      metrics: {
        cpu
      }
    }
  }
}

const quotaList = [
  getQuota({ name: 'trial-secret-quota', namespace: 'garden-trial' }),
  getQuota({ name: 'foo-quota1', namespace: 'garden-foo' }),
  getQuota({ name: 'foo-quota2', namespace: 'garden-foo' })
]

module.exports = {
  create (options) {
    return getQuota(options)
  },
  list () {
    return cloneDeepAndSetUid(quotaList)
  }
}
