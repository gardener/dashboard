//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { Forbidden, NotFound } = require('http-errors')
const authorization = require('./authorization')
const { findResourceQuotaByNamespace } = require('../cache')

function fromResource (resourceQuota) {
  const { status } = resourceQuota
  return {
    status
  }
}

exports.read = async function ({ user, namespace, name }) {
  const allowed = await authorization.canGetResourceQuota(user, namespace, name)
  if (!allowed) {
    throw new Forbidden(`You are not allowed to get resource quota ${name} in namespace ${namespace}`)
  }

  const resourceQuota = findResourceQuotaByNamespace(namespace, name)
  if (!resourceQuota) {
    throw new NotFound(`Resource Quota with name ${name} and namespace ${namespace} not found`)
  }

  return fromResource(resourceQuota)
}
