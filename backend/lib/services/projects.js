//
// Copyright 2018 by The Gardener Authors.
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

const createMembersClusterRole = async function ({namespace, username}) {
  const ClusterRole = Resources.ClusterRole
  const subjects = username ? [{
    kind: 'User',
    name: username,
    apiGroup: 'rbac.authorization.k8s.io'
  }] : []
  const body = {
    metadata: {
      name: 'garden-project-members',
      namespace,
      labels: {
        'garden.sapcloud.io/role': 'members'
      }
    },
    roleRef: {
      apiGroup: ClusterRole.apiGroup,
      kind: ClusterRole.kind,
      name: 'garden.sapcloud.io:system:project-member'
    },
    subjects
  }
  return rbac.namespaces(namespace).rolebindings.post({body})
}

exports._createMembersClusterRole = createMembersClusterRole

exports.list = async function ({user}) {
  const emptyClusterRoleBinding = {
    subjects: []
  }
  const [
    namespaces,
    roleBindings,
    gardenAdministrators
  ] = await Promise.all([
    core.namespaces.get({
      qs: {labelSelector: 'garden.sapcloud.io/role=project'}
    }),
    rbac.rolebindings.get({
      qs: {labelSelector: 'garden.sapcloud.io/role=members'}
    }),
    rbac.clusterrolebindings('garden-administrators').get()
      .catch(err => {
        if (err.code === 404) {
          return emptyClusterRoleBinding
        }
        throw err
      })
  ])
  const username = user.id
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
    name: username
  }
  const predicate = _.findIndex(gardenAdministrators.subjects, subject) === -1
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
  _.set(body, 'data.createdBy', username)
  body = toResource(body)
  const namespace = body.metadata.name
  body = await core.namespaces.post({body})
  await createMembersClusterRole({namespace, username})
  return fromResource(body)
}

exports.read = async function ({user, name}) {
  return fromResource(await core.namespaces(name).get())
}

exports.patch = async function ({user, name, body}) {
  _.unset(body, 'data.createdBy')
  body = toResource(body)
  body = await core.namespaces.mergePatch({name, body})
  return fromResource(body)
}

exports.remove = async function ({user, name}) {
  const username = user.id
  const namespace = name
  const projectName = name.replace(/^garden-/, '')
  const [memberList, shootList] = await Promise.all([
    members.list({user, namespace}),
    shoots.list({user, namespace})
  ])
  if (!_.includes(memberList, username)) {
    throw new Forbidden(`User ${username} is not a member of project ${projectName}`)
  }
  if (shootList.items.length > 0) {
    throw new PreconditionFailed(`Only empty projects can be deleted`)
  }
  await core.namespaces.delete({name})
  return {metadata: {name: projectName}}
}
