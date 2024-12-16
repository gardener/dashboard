//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const { dashboardClient } = require('@gardener-dashboard/kube-client')

const { PreconditionFailed, InternalServerError } = require('http-errors')
const shoots = require('./shoots')
const authorization = require('./authorization')
const { projectFilter, trimProject } = require('../utils')
const cache = require('../cache')
const logger = require('../logger')
const openfga = require('../openfga')

const PROJECT_INITIALIZATION_TIMEOUT = 30 * 1000

async function validateDeletePreconditions ({ user, name }) {
  const project = cache.getProject(name)
  const namespace = _.get(project, ['spec', 'namespace'])

  const shootList = await shoots.list({ user, namespace })
  if (!_.isEmpty(shootList.items)) {
    throw new PreconditionFailed('Only empty projects can be deleted')
  }
}

exports.list = async function ({ user, canListProjects }) {
  if (typeof canListProjects !== 'boolean') {
    canListProjects = await authorization.canListProjects(user)
  }
  let projectAllowList = []
  if (openfga.client) {
    try {
      projectAllowList = await openfga.listProjects(user.id)
    } catch (err) {
      logger.error('openfga query failed: %s', err)
    }
  }
  return _
    .chain(cache.getProjects())
    .filter(projectFilter(user, canListProjects, projectAllowList))
    .forEach(project => setComputedProjectAnnotations(project))
    .map(_.cloneDeep)
    .map(trimProject)
    .value()
}

exports.create = async function ({ user, body }) {
  const client = user.client

  const name = _.get(body, ['metadata', 'name'])
  const namespace = `garden-${name}`
  _.set(body, ['spec', 'namespace'], namespace)
  await client['core.gardener.cloud'].projects.create(body)

  const isProjectReady = ({ type, object: project }) => {
    if (type === 'DELETE') {
      throw new InternalServerError('Project resource has been deleted')
    }
    return {
      ok: _.get(project, ['status', 'phase']) === 'Ready',
    }
  }
  const timeout = exports.projectInitializationTimeout
  // must be the dashboardClient because rbac rolebinding does not exist yet
  const asyncIterable = await dashboardClient['core.gardener.cloud'].projects.watch(name)
  const project = await asyncIterable.until(isProjectReady, { timeout })
  return project
}
// needs to be exported for testing
exports.projectInitializationTimeout = PROJECT_INITIALIZATION_TIMEOUT

exports.read = async function ({ user, name }) {
  const client = user.client
  const project = await client['core.gardener.cloud'].projects.get(name)
  setComputedProjectAnnotations(project)
  return project
}

exports.patch = async function ({ user, name, body }) {
  const client = user.client
  const project = await client['core.gardener.cloud'].projects.mergePatch(name, body)
  setComputedProjectAnnotations(project)
  return project
}

function setComputedProjectAnnotations (project) {
  if (process.env.NODE_ENV === 'test') {
    return
  }
  const shoots = cache.getShoots(project.spec.namespace) ?? []
  _.set(project, ['metadata', 'annotations', 'computed.gardener.cloud/number-of-shoots'], shoots.length)
}

exports.remove = async function ({ user, name }) {
  await validateDeletePreconditions({ user, name })

  const client = user.client

  const body = {
    metadata: {
      annotations: {
        'confirmation.gardener.cloud/deletion': 'true',
      },
    },
  }
  await client['core.gardener.cloud'].projects.mergePatch(name, body)
  try {
    const project = await client['core.gardener.cloud'].projects.delete(name)
    return project
  } catch (error) {
    // Revert the annotation if deletion fails
    const revertBody = {
      metadata: {
        annotations: {
          'confirmation.gardener.cloud/deletion': null,
        },
      },
    }
    await client['core.gardener.cloud'].projects.mergePatch(name, revertBody)
    throw error // Re-throw the error after reverting the annotation
  }
}
