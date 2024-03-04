//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const {
  dashboardClient,
  Resources
} = require('@gardener-dashboard/kube-client')

const { PreconditionFailed, InternalServerError } = require('http-errors')
const shoots = require('./shoots')
const authorization = require('./authorization')
const { projectFilter } = require('../utils')
const cache = require('../cache')
const logger = require('../logger')
const openfga = require('../openfga')

const PROJECT_INITIALIZATION_TIMEOUT = 30 * 1000

function fromResource ({ metadata, spec = {}, status = {} }) {
  const role = 'project'
  const { name, resourceVersion, creationTimestamp, annotations } = metadata
  const { namespace, createdBy, owner, description, purpose } = spec
  const { staleSinceTimestamp, staleAutoDeleteTimestamp, phase } = status

  return {
    metadata: {
      name,
      namespace,
      resourceVersion,
      role,
      creationTimestamp,
      annotations
    },
    data: {
      createdBy: fromSubject(createdBy),
      owner: fromSubject(owner),
      description,
      purpose,
      staleSinceTimestamp,
      staleAutoDeleteTimestamp,
      phase
    }
  }
}

function toResource ({ metadata, data = {} }) {
  const { apiVersion, kind } = Resources.Project
  const { name, namespace, resourceVersion, annotations } = metadata
  const { createdBy, owner, description = null, purpose = null } = data

  return {
    apiVersion,
    kind,
    metadata: {
      name,
      resourceVersion,
      annotations
    },
    spec: {
      namespace,
      createdBy: toSubject(createdBy),
      owner: toSubject(owner),
      description,
      purpose
    }
  }
}

function toResourceMergePatchDocument ({ metadata: { annotations } = {}, data = {} }) {
  const document = {}
  if (!_.isEmpty(annotations)) {
    document.metadata = { annotations }
  }
  if (!_.isEmpty(data)) {
    document.spec = {}
    for (let [key, value] of Object.entries(data)) {
      if (value) {
        switch (key) {
          case 'owner':
            value = toSubject(value)
            break
        }
        document.spec[key] = value
      } else if (value === null) {
        document.spec[key] = null
      }
    }
  }
  return document
}

function fromSubject ({ name } = {}) {
  return name
}

function toSubject (username) {
  if (username) {
    return {
      apiGroup: 'rbac.authorization.k8s.io',
      kind: 'User',
      name: username
    }
  }
}

async function validateDeletePreconditions ({ user, namespace }) {
  const shootList = await shoots.list({ user, namespace })
  if (!_.isEmpty(shootList.items)) {
    throw new PreconditionFailed('Only empty projects can be deleted')
  }
}

function getProjectName (namespace) {
  return cache.findProjectByNamespace(namespace).metadata.name
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
    .map(fromResource)
    .value()
}

exports.create = async function ({ user, body }) {
  const client = user.client

  const name = _.get(body, 'metadata.name')
  _.set(body, 'metadata.namespace', `garden-${name}`)
  _.set(body, 'data.createdBy', user.id)
  let project = await client['core.gardener.cloud'].projects.create(toResource(body))

  const isProjectReady = ({ type, object: project }) => {
    if (type === 'DELETE') {
      throw new InternalServerError('Project resource has been deleted')
    }
    return _.get(project, 'status.phase') === 'Ready'
  }
  const timeout = exports.projectInitializationTimeout
  // must be the dashboardClient because rbac rolebinding does not exist yet
  const asyncIterable = await dashboardClient['core.gardener.cloud'].projects.watch(name)
  project = await asyncIterable.until(isProjectReady, { timeout })

  return fromResource(project)
}
// needs to be exported for testing
exports.projectInitializationTimeout = PROJECT_INITIALIZATION_TIMEOUT

exports.read = async function ({ user, name: namespace }) {
  const client = user.client
  const name = getProjectName(namespace)
  const project = await client['core.gardener.cloud'].projects.get(name)
  return fromResource(project)
}

exports.patch = async function ({ user, name: namespace, body: { metadata, data } }) {
  const client = user.client
  const name = getProjectName(namespace)
  const body = toResourceMergePatchDocument({ metadata, data })
  const project = await client['core.gardener.cloud'].projects.mergePatch(name, body)
  return fromResource(project)
}

exports.remove = async function ({ user, name: namespace }) {
  await validateDeletePreconditions({ user, namespace })

  const client = user.client

  const name = getProjectName(namespace)
  const body = {
    metadata: {
      annotations: {
        'confirmation.gardener.cloud/deletion': 'true'
      }
    }
  }
  const project = await client['core.gardener.cloud'].projects.mergePatch(name, body)
  await client['core.gardener.cloud'].projects.delete(name)
  return fromResource(project)
}
