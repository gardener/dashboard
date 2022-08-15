//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { cloneDeep, find } = require('lodash')

function getResourceQuotas ({ uid, name, namespace, hard, used }) {
  const metadata = {
    name,
    namespace,
    uid
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
      'count/secrets': '70'
    },
    used: {
      'count/configmaps': '5',
      'count/secrets': '12'
    }
  })
]

const resourceQuotas = {
  create (options) {
    return getResourceQuotas(options)
  },
  get (name, namespace) {
    const items = resourceQuotas.list()
    return find(items.metadata, { name, namespace })
  },
  list () {
    return cloneDeep(resourceQuotasList)
  }
}

module.exports = {
  ...resourceQuotas
}
