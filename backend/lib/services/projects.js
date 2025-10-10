//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import kubeClientModule from '@gardener-dashboard/kube-client'
import httpErrors from 'http-errors'
import * as shoots from './shoots.js'
import * as authorization from './authorization.js'
import {
  projectFilter,
  simplifyProject,
} from '../utils/index.js'
import cache from '../cache/index.js'
import logger from '../logger/index.js'
import openfga from '../openfga/index.js'
const { dashboardClient } = kubeClientModule
const { PreconditionFailed, InternalServerError } = httpErrors

// needs to be exported for testing
export const PROJECT_INITIALIZATION_TIMEOUT = 30 * 1000

async function validateDeletePreconditions ({ user, name }) {
  const project = cache.getProject(name)
  const namespace = _.get(project, ['spec', 'namespace'])

  const shootList = await shoots.list({ user, namespace })
  if (!_.isEmpty(shootList.items)) {
    throw new PreconditionFailed('Only empty projects can be deleted')
  }
}

export async function list ({ user, canListProjects }) {
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
    .map(simplifyProject)
    .value()
}

export async function create ({ user, body }) {
  const client = user.client

  const accountId = _.get(body, ['metadata', 'annotations', 'openmfp.org/account-id'])
  const name = _.get(body, ['metadata', 'name'])
  const namespace = `garden-${name}`
  _.set(body, ['spec', 'namespace'], namespace)
  let project = await client['core.gardener.cloud'].projects.create(body)

  const isProjectReady = ({ type, object: project }) => {
    if (type === 'DELETE') {
      throw new InternalServerError('Project resource has been deleted')
    }
    return {
      ok: _.get(project, ['status', 'phase']) === 'Ready',
    }
  }
  // must be the dashboardClient because rbac rolebinding does not exist yet
  const asyncIterable = await dashboardClient['core.gardener.cloud'].projects.watch(name)
  project = await asyncIterable.until(isProjectReady, { PROJECT_INITIALIZATION_TIMEOUT })
  if (openfga.client && accountId) {
    try {
      await openfga.writeProject(namespace, accountId)
    } catch (err) {
      logger.error('Failed to write openfga account releation:', err)
    }
  }

  return project
}

export async function read ({ user, name }) {
  const client = user.client
  const project = await client['core.gardener.cloud'].projects.get(name)
  setComputedProjectAnnotations(project)
  return project
}

export async function patch ({ user, name, body }) {
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

export async function remove ({ user, name }) {
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
