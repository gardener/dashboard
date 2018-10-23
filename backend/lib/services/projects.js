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
const Resources = require('../kubernetes/Resources')
const core = require('../kubernetes').core()
const rbac = require('../kubernetes').rbac()
const { Forbidden, PreconditionFailed } = require('../errors')
const members = require('./members')
const shoots = require('./shoots')
const administrators = require('./administrators')

function fromResource ({metadata}) {
  const annotations = metadata.annotations || {}
  const labels = metadata.labels || {}
  const role = 'project'
  const resourceVersion = metadata.resourceVersion
  const namespace = metadata.name
  const name = labels['project.garden.sapcloud.io/name'] || namespace.replace(/^garden-/, '')
  const creationTimestamp = metadata.creationTimestamp
  metadata = {name, namespace, resourceVersion, role, creationTimestamp}
  const data = {
    createdBy: annotations['project.garden.sapcloud.io/createdBy'],
    owner: annotations['project.garden.sapcloud.io/owner'],
    description: annotations['project.garden.sapcloud.io/description'],
    purpose: annotations['project.garden.sapcloud.io/purpose']
  }
  return {metadata, data}
}

function toResource ({metadata, data}) {
  const resource = Resources.Namespace
  const apiVersion = resource.apiVersion
  const kind = resource.kind
  const labels = {
    'garden.sapcloud.io/role': 'project',
    'project.garden.sapcloud.io/name': metadata.name
  }
  data = data || {}
  const annotations = {
    'project.garden.sapcloud.io/createdBy': data.createdBy,
    'project.garden.sapcloud.io/owner': data.owner,
    'project.garden.sapcloud.io/description': data.description,
    'project.garden.sapcloud.io/purpose': data.purpose
  }
  const name = metadata.namespace || `garden-${metadata.name}`
  const resourceVersion = metadata.resourceVersion
  metadata = {name, resourceVersion, labels, annotations}
  return {apiVersion, kind, metadata}
}

async function authorize ({user, namespace}) {
  const [
    memberList,
    isAdmin
  ] = await Promise.all([
    members.list({user, namespace}),
    administrators.isAdmin(user)
  ])
  const username = user.id
  const isMember = _.includes(memberList, username)
  if (!isMember && !isAdmin) {
    const projectName = namespace.replace(/^garden-/, '')
    throw new Forbidden(`User ${username} is not authorized to access project ${projectName}`)
  }
}

async function validateDeletePreconditions ({user, namespace}) {
  const shootList = await shoots.list({user, namespace})
  if (!_.isEmpty(shootList.items)) {
    throw new PreconditionFailed(`Only empty projects can be deleted`)
  }
}

exports.list = async function ({user}) {
  const [
    namespaces,
    roleBindings,
    isAdmin
  ] = await Promise.all([
    core.namespaces.get({
      qs: {labelSelector: 'garden.sapcloud.io/role=project'}
    }),
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
    return item => _.includes(userNamespaces, item.metadata.name)
  }

  const subject = {
    kind: 'User',
    name: user.id
  }

  const predicate = !isAdmin
    ? isMemberOf(roleBindings, subject)
    : _.identity

  return _
    .chain(namespaces.items)
    .filter(predicate)
    .map(fromResource)
    .value()
}

exports.create = async function ({user, body}) {
  const username = user.id
  // transfrom project to namespace resource
  _.set(body, 'data.createdBy', username)
  body = toResource(body)
  // create namespace
  const name = body.metadata.name
  const namespace = name
  body = await core.namespaces.post({body})
  try {
    // bootstrap the rolebinding for project members
    await members.bootstrap({user, namespace})
  } catch (err) {
    // rollback the namespace in case of an error
    await core.namespaces.delete({name})
    throw err
  }
  return fromResource(body)
}

exports.read = async function ({user, name}) {
  // validate user authorizations
  const namespace = name
  await authorize({user, namespace})
  // read namespace
  return fromResource(await core.namespaces.get({name}))
}

exports.patch = async function ({user, name, body}) {
  // transfrom project to namespace resource
  _.unset(body, 'data.createdBy')
  body = toResource(body)
  // validate user authorizations
  const namespace = name
  await authorize({user, namespace})
  // patch namespace
  return fromResource(await core.namespaces.mergePatch({name, body}))
}

exports.remove = async function ({user, name}) {
  // validate user authorizations
  const namespace = name
  await authorize({user, namespace})
  // validate preconditions
  await validateDeletePreconditions({user, namespace})
  // delete namespace
  await core.namespaces.delete({name})
  return fromResource({metadata: {name}})
}

exports.projectName = async function ({user, namespace}) {
  await authorize({user, namespace})
  // read namespace
  const ns = await core.namespaces.get({name: namespace})
  // eslint-disable-next-line lodash/path-style
  console.log(ns)
  return _.get(ns, ['metadata', 'labels', 'project.garden.sapcloud.io/name'])
}
