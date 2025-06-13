//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import httpErrors from 'http-errors'
import * as authorization from './authorization.mjs'
import cache from '../cache/index.mjs'
const { Forbidden } = httpErrors
const { getResourceQuotas } = cache

function fromResource (resourceQuotas) {
  return _.map(resourceQuotas, ({ status }) => {
    return {
      metadata: {},
      spec: {},
      status,
    }
  })
}

export async function list ({ user, namespace }) {
  const allowed = await authorization.canListResourceQuotas(user, namespace)
  if (!allowed) {
    throw new Forbidden(`You are not allowed to list resource quotas in namespace ${namespace}`)
  }

  const resourceQuotas = _.filter(getResourceQuotas(), ['metadata.namespace', namespace])
  return fromResource(resourceQuotas)
}
