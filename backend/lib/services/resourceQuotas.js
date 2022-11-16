//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const { Forbidden } = require('http-errors')
const authorization = require('./authorization')
const { getResourceQuotas } = require('../cache')

function fromResource (resourceQuotas) {
  return _.map(resourceQuotas, ({ status }) => {
    return {
      metadata: {},
      spec: {},
      status
    }
  })
}

exports.list = async function ({ user, namespace }) {
  const allowed = await authorization.canListResourceQuotas(user, namespace)
  if (!allowed) {
    throw new Forbidden(`You are not allowed to list resource quotas in namespace ${namespace}`)
  }

  const resourceQuotas = _.filter(getResourceQuotas(), ['metadata.namespace', namespace])
  return fromResource(resourceQuotas)
}
