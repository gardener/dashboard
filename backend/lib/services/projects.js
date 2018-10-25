//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
const kubernetes = require('../kubernetes')
const Resources = kubernetes.Resources
const garden = kubernetes.garden()
const core = kubernetes.core()
const { PreconditionFailed, NotFound, GatewayTimeout, InternalServerError } = require('../errors')
const logger = require('../logger')
const shoots = require('./shoots')
const administrators = require('./administrators')

const PROJECT_INITIALIZATION_TIMEOUT = 60 * 1000

function Garden ({auth}) {
  return kubernetes.garden({auth})
}

function fromResource ({metadata, spec = {}}) {
  const role = 'project'
  const { name, resourceVersion, creationTimestamp } = metadata
  const { namespace, createdBy: createdByRef = {}, owner: ownerRef = {}, description, purpose } = spec
  const { name: owner } = ownerRef
  const { name: createdBy } = createdByRef
  return {
    metadata: {
      name,
      namespace,
      resourceVersion,
      role,
      creationTimestamp
    },
    data: {
      createdBy,
      owner,
      description,
      purpose
    }
  }
}

function toResource ({metadata, data = {}}) {
  const { apiVersion, kind } = Resources.Project
  const { name, namespace, resourceVersion } = metadata
  const { createdBy, owner, description, purpose } = data
  const ownerRef = {
    apiGroup: 'rbac.authorization.k8s.io',
    kind: 'User',
    name: owner
  }
  const createdByRef = {
    apiGroup: 'rbac.authorization.k8s.io',
    kind: 'User',
    name: createdBy
  }
  return {
    apiVersion,
    kind,
    metadata: {
      name,
      resourceVersion
    },
    spec: {
      namespace,
      createdBy: createdByRef,
      owner: ownerRef,
      description,
      purpose
    }
  }
}

async function validateDeletePreconditions ({user, namespace}) {
  const shootList = await shoots.list({user, namespace})
  if (!_.isEmpty(shootList.items)) {
    throw new PreconditionFailed(`Only empty projects can be deleted`)
  }
}

async function getProjectNameFromNamespace (namespace) {
  // read namespace
  const ns = await core.namespaces.get({name: namespace})
  // get name of project from namespace label
  const name = _.get(ns, ['metadata', 'labels', 'project.garden.sapcloud.io/name'])
  if (!name) {
    throw new NotFound(`Namespace '${namespace}' is not related to a gardener project`)
  }
  return name
}

exports.list = async function ({user}) {
  const [
    projects,
    isAdmin
  ] = await Promise.all([
    garden.projects.get(),
    administrators.isAdmin(user)
  ])

  const subject = {
    kind: 'User',
    name: user.id
  }

  const predicate = !isAdmin
    ? project => _
      .chain(project)
      .get('spec.members')
      .findIndex(subject)
      .gte(0)
      .value()
    : _.identity

  return _
    .chain(projects)
    .get('items')
    .filter(predicate)
    .map(fromResource)
    .value()
}

function isProjectReady ({status: {phase} = {}} = {}) {
  return phase === 'Ready'
}

function waitUntilProjectIsReady (projects, name) {
  const reconnector = exports.watchProject(projects, name)
  const projectInitializationTimeout = exports.projectInitializationTimeout

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const duration = `${projectInitializationTimeout} ms`
      done(new GatewayTimeout(`Project could not be initialized within ${duration}`))
    }, projectInitializationTimeout)

    function done (err, project) {
      // clear timeout
      clearTimeout(timeoutId)
      // remove all listeners
      reconnector.removeListener('event', onEvent)
      reconnector.removeListener('error', onError)
      reconnector.removeListener('disconnect', onDisconnect)
      // prevent reconnecting
      reconnector.reconnect = false
      // disconnect
      reconnector.disconnect()
      if (err) {
        return reject(err)
      }
      resolve(project)
    }

    function onEvent (event) {
      switch (event.type) {
        case 'ADDED':
        case 'MODIFIED':
          if (isProjectReady(event.object)) {
            done(null, event.object)
          }
          break
        case 'DELETED':
          done(new InternalServerError(`Project "${name}" has been deleted`))
          break
      }
    }

    function onError (err) {
      logger.error(`Error watching project "%s": %s`, name, err.message)
    }

    function onDisconnect (err) {
      done(err || new InternalServerError(`Watch for project "${name}" has been disconnected`))
    }

    reconnector.on('event', onEvent)
    reconnector.on('error', onError)
    reconnector.on('disconnect', onDisconnect)
  })
}

exports.create = async function ({user, body}) {
  // initialize createdBy
  _.set(body, 'data.createdBy', user.id)
  // create garden client for current user
  const projects = Garden(user).projects
  // create project with service account
  let project = await projects.post({body: toResource(body)})
  // project name
  const name = project.metadata.name
  // wait until project is ready
  project = await waitUntilProjectIsReady(projects, name)
  // project is ready now
  return fromResource(project)
}
// used for testing
exports.watchProject = (projects, name) => projects.watch({name})
exports.projectInitializationTimeout = PROJECT_INITIALIZATION_TIMEOUT

exports.read = async function ({user, name: namespace}) {
  // get name of project
  const name = await getProjectNameFromNamespace(namespace)
  // create garden client for current user
  const projects = Garden(user).projects
  // read project
  const project = await projects.get({name})
  return fromResource(project)
}

exports.patch = async function ({user, name: namespace, body}) {
  // get name of project
  const name = await getProjectNameFromNamespace(namespace)
  // create garden client for current user
  const projects = Garden(user).projects
  // read project
  let project = await projects.get({name})
  // do not update createdBy
  const { metadata, data } = fromResource(project)
  _.assign(data, _.omit(body.data, 'createdBy'))
  // patch project
  project = await projects.mergePatch({
    name,
    body: toResource({metadata, data})
  })
  return fromResource(project)
}

exports.remove = async function ({user, name: namespace}) {
  // validate preconditions
  await validateDeletePreconditions({user, namespace})
  // get name of project
  const name = await getProjectNameFromNamespace(namespace)
  // create garden client for current user
  const projects = Garden(user).projects
  // read project
  const project = await projects.get({name})
  // patch annotations
  const annotations = _.assign({
    'confirmation.garden.sapcloud.io/deletion': 'true'
  }, project.metadata.annotations)
  await projects.mergePatch({
    name,
    body: {
      metadata: {
        annotations
      }
    }
  })
  // delete project
  await projects.delete({name})
  return fromResource(project)
}
