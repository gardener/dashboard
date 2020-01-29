//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict'

const _ = require('lodash')
const {
  dashboardClient,
  Resources
} = require('../kubernetes-client')
const { PreconditionFailed } = require('../errors')
const shoots = require('./shoots')
const authorization = require('./authorization')

const PROJECT_INITIALIZATION_TIMEOUT = 30 * 1000

function fromResource ({ metadata, spec = {} }) {
  const role = 'project'
  const { name, resourceVersion, creationTimestamp } = metadata
  const { namespace, createdBy, owner, description, purpose } = spec
  return {
    metadata: {
      name,
      namespace,
      resourceVersion,
      role,
      creationTimestamp
    },
    data: {
      createdBy: fromSubject(createdBy),
      owner: fromSubject(owner),
      description,
      purpose
    }
  }
}

function toResource ({ metadata, data = {} }) {
  const { apiVersion, kind } = Resources.Project
  const { name, namespace, resourceVersion } = metadata
  const { createdBy, owner } = data

  const description = data.description || null
  const purpose = data.purpose || null

  return {
    apiVersion,
    kind,
    metadata: {
      name,
      resourceVersion
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

exports.list = async function ({ user, qs = {} }) {
  const [
    projects,
    isAdmin
  ] = await Promise.all([
    dashboardClient['core.gardener.cloud'].projects.list(),
    authorization.isAdmin(user)
  ])

  const isMemberOf = project => _
    .chain(project)
    .get('spec.members')
    .findIndex({
      kind: 'User',
      name: user.id
    })
    .gte(0)
    .value()

  const phases = _
    .chain(qs)
    .get('phase', 'Ready')
    .split(',')
    .compact()
    .value()
  return _
    .chain(projects)
    .get('items')
    .filter(project => {
      if (!isAdmin && !isMemberOf(project)) {
        return false
      }
      if (!_.isEmpty(phases)) {
        const phase = _.get(project, 'status.phase', 'Initial')
        return _.includes(phases, phase)
      }
      return true
    })
    .map(fromResource)
    .value()
}

exports.create = async function ({ user, body }) {
  const client = user.client

  const name = _.get(body, 'metadata.name')
  _.set(body, 'metadata.namespace', `garden-${name}`)
  _.set(body, 'data.createdBy', user.id)
  let project = await client['core.gardener.cloud'].projects.create(toResource(body))

  const isProjectReady = project => {
    return _.get(project, 'status.phase') === 'Ready'
  }
  const timeout = exports.projectInitializationTimeout
  // must be the dashboardClient because rbac rolebinding does not exist yet
  project = await dashboardClient['core.gardener.cloud'].projects
    .watch(name)
    .waitFor(isProjectReady, { timeout })

  return fromResource(project)
}
// needs to be exported for testing
exports.projectInitializationTimeout = PROJECT_INITIALIZATION_TIMEOUT

exports.read = async function ({ user, name: namespace }) {
  const client = user.client
  const project = await client.getProjectByNamespace(namespace)
  return fromResource(project)
}

exports.patch = async function ({ user, name: namespace, body }) {
  const client = user.client

  const project = await client.getProjectByNamespace(namespace)
  const name = project.metadata.name
  // do not update createdBy
  const { metadata, data } = fromResource(project)
  _.assign(data, _.omit(body.data, 'createdBy'))
  body = toResource({ metadata, data })
  body = await client['core.gardener.cloud'].projects.mergePatch(name, body)
  return fromResource(body)
}

exports.remove = async function ({ user, name: namespace }) {
  await validateDeletePreconditions({ user, namespace })

  const client = user.client

  const project = await client.getProjectByNamespace(namespace)
  const name = project.metadata.name
  const annotations = _.assign({
    'confirmation.garden.sapcloud.io/deletion': 'true'
  }, project.metadata.annotations)
  const body = { metadata: { annotations } }
  await client['core.gardener.cloud'].projects.mergePatch(name, body)
  await client['core.gardener.cloud'].projects.delete(name)
  return fromResource(project)
}
