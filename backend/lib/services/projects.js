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
import getCache from '../cache/index.js'
const { PreconditionFailed, InternalServerError } = httpErrors
const { createDashboardClient } = kubeClientModule

// needs to be exported for testing
export const PROJECT_INITIALIZATION_TIMEOUT = 30 * 1000

async function validateDeletePreconditions ({ user, name }) {
  const cache = getCache(user.workspace)
  const project = cache.getProject(name)
  const namespace = _.get(project, ['spec', 'namespace'])

  const shootList = await shoots.list({ user, namespace })
  if (!_.isEmpty(shootList.items)) {
    throw new PreconditionFailed('Only empty projects can be deleted')
  }
}

export async function list ({ user }) {
  const cache = getCache(user.workspace)
  const canListProjects = await authorization.canListProjects(user)
  return _
    .chain(cache.getProjects())
    .filter(projectFilter(user, canListProjects))
    .map(_.cloneDeep)
    .map(simplifyProject)
    .value()
}

export async function create ({ user, body }) {
  const client = user.client
  const dashboardClient = createDashboardClient(user.workspace)

  const name = _.get(body, ['metadata', 'name'])
  _.set(body, ['spec', 'namespace'], `garden-${name}`)
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

  return project
}

export async function read ({ user, name }) {
  const client = user.client
  const project = await client['core.gardener.cloud'].projects.get(name)
  return project
}

export async function patch ({ user, name, body }) {
  const client = user.client
  const project = await client['core.gardener.cloud'].projects.mergePatch(name, body)
  return project
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
