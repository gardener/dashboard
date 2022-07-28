//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const cache = require('../cache')
const createError = require('http-errors')
const { dashboardClient, Resources } = require('@gardener-dashboard/kube-client')

async function hasAuthorization ({ id: user, groups }, { resourceAttributes }) {
  const { apiVersion, kind } = Resources.SubjectAccessReview
  const body = {
    kind,
    apiVersion,
    spec: {
      user,
      groups,
      resourceAttributes
    }
  }
  const { status = {} } = await dashboardClient['authorization.k8s.io'].subjectaccessreviews.create(body)
  return status.allowed
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
  async list ({ user, namespace, shootsWithIssuesOnly } = {}) {
    const allowed = await authorization.canListShoots(user, namespace)
    if (!allowed) {
      const message = namespace
        ? `Not authorized to list shoots in namepsace ${namespace}`
        : 'Not authorized to list shoots of all namespaces'
      throw createError(403, message)
    }
    const items = cache.getShoots().filter(({ metadata }) => {
      if (metadata.namespace !== namespace) {
        return false
      }
      if (shootsWithIssuesOnly === true) {
        const { labels = {} } = metadata
        if (!labels['shoot.gardener.cloud/status'] || labels['shoot.gardener.cloud/status'] === 'healthy') {
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
  async read ({ user, namepsace, name }) {
    const allowed = await authorization.canGetShoot(user, namepsace, name)
    if (!allowed) {
      throw createError(403, `Not authorized to get shoot ${name} in namepsace ${namepsace}`)
    }
    const shoot = cache.getShoot(namepsace, name)
    if (!shoot) {
      throw createError(404, `Shoot "${name}" not found in namespace "${namepsace}"`)
    }
    return shoot
  }
}

const projects = {
  async list ({ user }) {
    const admin = await authorization.isAdmin(user)
    const isMemberOf = project => {
      return _
        .chain(project)
        .get('spec.members')
        .find(({ kind, namespace, name }) => {
          switch (kind) {
            case 'Group':
              if (_.includes(user.groups, name)) {
                return true
              }
              break
            case 'User':
              if (user.id === name) {
                return true
              }
              break
            case 'ServiceAccount':
              if (user.id === `system:serviceaccount:${namespace}:${name}`) {
                return true
              }
              break
          }
          return false
        })
        .value()
    }
    const isReady = project => {
      return _.get(project, 'status.phase') === 'Ready'
    }
    return _
      .chain(cache.getProjects())
      .filter(project => {
        if (!admin && !isMemberOf(project)) {
          return false
        }
        if (!isReady(project)) {
          return false
        }
        return true
      })
      .value()
  }
}

module.exports = {
  authorization,
  shoots,
  projects
}
