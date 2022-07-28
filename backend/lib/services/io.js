//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const { projectFilter } = require('../utils')
const cache = require('../cache')
const createError = require('http-errors')
const { dashboardClient, Resources } = require('@gardener-dashboard/kube-client')

async function hasAuthorization (user, { resourceAttributes }) {
  const { apiVersion, kind } = Resources.SubjectAccessReview
  const body = {
    kind,
    apiVersion,
    spec: {
      user: user.id,
      groups: user.groups,
      resourceAttributes
    }
  }
  const { status: { allowed = false } = {} } = await dashboardClient['authorization.k8s.io'].subjectaccessreviews.create(body)
  return allowed
}

const authorization = {
  canListShoots (user, namespace) {
    const resourceAttributes = {
      verb: 'list',
      group: 'core.gardener.cloud',
      resource: 'shoots',
      namespace
    }
    return hasAuthorization(user, { resourceAttributes })
  },
  canGetShoot (user, namespace, name) {
    const resourceAttributes = {
      verb: 'get',
      group: 'core.gardener.cloud',
      resource: 'shoots',
      namespace,
      name
    }
    return hasAuthorization(user, { resourceAttributes })
  },
  isAdmin (user) {
    const resourceAttributes = {
      verb: 'get',
      group: '',
      resource: 'secrets'
    }
    return hasAuthorization(user, { resourceAttributes })
  }
}

const shoots = {
  async list ({ user, namespace, shootsWithIssuesOnly }) {
    const allowed = await authorization.canListShoots(user, namespace)
    if (!allowed) {
      const message = namespace
        ? `Not authorized to list shoots in namespace ${namespace}`
        : 'Not authorized to list shoots of all namespaces'
      throw createError(403, message)
    }
    const items = cache.getShoots().filter(({ metadata }) => {
      if (namespace && metadata.namespace !== namespace) {
        return false
      }
      if (shootsWithIssuesOnly === true) {
        const status = _
          .chain(metadata)
          .get('labels["shoot.gardener.cloud/status"]', 'initial')
          .lowerCase()
          .value()
        if (status === 'healthy') {
          return false
        }
      }
      return true
    })
    return {
      apiVersion: 'v1',
      kind: 'List',
      metadata: {},
      items
    }
  },
  async read ({ user, namespace, name }) {
    const allowed = await authorization.canGetShoot(user, namespace, name)
    if (!allowed) {
      throw createError(403, `Not authorized to get shoot ${name} in namespace ${namespace}`)
    }
    const shoot = cache.getShoot(namespace, name)
    if (!shoot) {
      throw createError(404, `Shoot ${name} not found in namespace ${namespace}`)
    }
    return shoot
  }
}

const projects = {
  async list ({ user }) {
    const isAdmin = await authorization.isAdmin(user)
    return _
      .chain(cache.getProjects())
      .filter(projectFilter(user, isAdmin))
      .value()
  }
}

module.exports = {
  authorization,
  shoots,
  projects
}
