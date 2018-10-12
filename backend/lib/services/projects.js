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
const rbac = kubernetes.rbac()
const { PreconditionFailed } = require('../errors')
const shoots = require('./shoots')
const administrators = require('./administrators')

function Garden ({auth}) {
  return kubernetes.garden({auth})
}

function fromResource ({metadata, spec = {}}) {
  const role = 'project'
  const { name, resourceVersion, creationTimestamp, annotations = {} } = metadata
  const { namespace, purpose, description, owner: ownerRef = {} } = spec
  const { name: owner } = ownerRef
  const createdBy = annotations['project.garden.sapcloud.io/createdBy'] ||
                    annotations['garden.sapcloud.io/createdBy']
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
  const annotations = {
    'project.garden.sapcloud.io/createdBy': createdBy
  }
  const ownerRef = {
    apiGroup: 'rbac.authorization.k8s.io',
    kind: 'User',
    name: owner
  }
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

async function getProjectNameFromNamespace (name) {
  // read namespace
  const namespace = await core.namespaces.get({name})
  // get name of project from namespace label
  return _.get(namespace, ['metadata', 'labels', 'project.garden.sapcloud.io/name'])
}

exports.list = async function ({user}) {
  const [
    projects,
    roleBindings,
    isAdmin
  ] = await Promise.all([
    garden.projects.get(),
    rbac.rolebindings.get({
      qs: {labelSelector: 'garden.sapcloud.io/role=members'}
    }),
    administrators.isAdmin(user)
  ])

  const isMemberOf = (roleBindings, subject) => {
    const userNamespaces = _
      .chain(roleBindings.items)
      .filter(item => _.findIndex(item.subjects, subject) !== -1)
      .map(item => item.metadata.namespace)
      .value()
    return item => _.includes(userNamespaces, item.spec.namespace)
  }

  const subject = {
    kind: 'User',
    name: user.id
  }

  const predicate = !isAdmin
    ? isMemberOf(roleBindings, subject)
    : _.identity

  return _
    .chain(projects.items)
    .filter(predicate)
    .map(fromResource)
    .value()
}

exports.create = async function ({user, body}) {
  const username = user.id
  // transfrom to project resource
  _.set(body, 'data.createdBy', username)
  let project = toResource(body)
  // create project with service account
  project = await garden.projects.post({body: project})
  return fromResource(project)
}

exports.read = async function ({user, name}) {
  // get name of project
  name = await getProjectNameFromNamespace(name)
  // create garden client for current user
  const projects = Garden(user).projects
  // read project
  const project = await projects.get({name})
  return fromResource(project)
}

exports.patch = async function ({user, name, body}) {
  // get name of project
  name = await getProjectNameFromNamespace(name)
  // create garden client for current user
  const projects = Garden(user).projects
  // transfrom to project resource
  _.unset(body, 'data.createdBy')
  body = toResource(body)
  // patch project
  const project = await projects.mergePatch({name, body})
  return fromResource(project)
}

exports.remove = async function ({user, name}) {
  // validate preconditions
  await validateDeletePreconditions({user, namespace: name})
  // get name of project
  name = await getProjectNameFromNamespace(name)
  // create garden client for current user
  const projects = Garden(user).projects
  // patch annotations
  await projects.jsonPatch({
    name,
    body: [{
      op: 'add',
      path: '/metadata/annotations/confirmation.garden.sapcloud.io~1deletion',
      value: 'true'
    }]
  })
  // delete project
  await projects.delete({name})
  return fromResource({metadata: {name}})
}
