//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { cloneDeep } = require('lodash')

function getResourceQuotas ({ uid, name, namespace, hard, used }) {
  const metadata = {
    name,
    namespace,
    uid,
  }
  const spec = {}
  if (hard) {
    spec.hard = hard
  }
  const status = {}
  if (hard) {
    status.hard = hard
  }
  if (used) {
    status.used = used
  }

  return { metadata, spec, status }
}

const resourceQuotasList = [
  getResourceQuotas({
    uid: 1,
    name: 'gardener',
    namespace: 'garden-foo',
    hard: {
      'count/configmaps': '22',
      'count/secrets': '70',
    },
    used: {
      'count/configmaps': '5',
      'count/secrets': '12',
    },
  }),
]

const resourceQuotas = {
  list () {
    return cloneDeep(resourceQuotasList)
  },
}

module.exports = {
  ...resourceQuotas,
}
