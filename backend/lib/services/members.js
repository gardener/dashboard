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
const config = require('../config')
const { decodeBase64, getProjectByNamespace } = require('../utils')
const kubernetes = require('../kubernetes')
const { Conflict, NotFound } = require('../errors.js')

function Core ({ auth }) {
  return kubernetes.core({ auth })
}

function Garden ({ auth }) {
  return kubernetes.garden({ auth })
}

function fromResource (project = {}) {
  return _
    .chain(project)
    .get('spec.members')
    .filter(['kind', 'User'])
    .map('name')
    .value()
}

function createServiceaccount (core, namespace, name) {
  const body = { metadata: { name, namespace } }
  return core.namespaces(namespace).serviceaccounts.post({
    body
  })
}

function deleteServiceaccount (core, namespace, name) {
  return core.namespaces(namespace).serviceaccounts.delete({
    name
  })
    .catch(err => {
      if (err.code === 404 || err.code === 410) {
        return { metadata: { name, namespace } }
      }
      throw err
    })
}

async function setProjectMember (projects, namespaces, namespace, username) {
  // get project
  const project = await getProjectByNamespace(projects, namespaces, namespace)
  // get project members from project
  const members = _.slice(project.spec.members, 0)
  if (_.find(members, ['name', username])) {
    throw new Conflict(`User '${username}' is already member of this project`)
  }
  members.push({
    kind: 'User',
    name: username,
    apiGroup: 'rbac.authorization.k8s.io'
  })
  const body = {
    spec: {
      members
    }
  }
  return projects.mergePatch({ name: project.metadata.name, body })
}

async function unsetProjectMember (projects, namespaces, namespace, username) {
  // get project
  const project = await getProjectByNamespace(projects, namespaces, namespace)
  // get project members from project
  const members = _.slice(project.spec.members, 0)
  if (!_.find(members, ['name', username])) {
    return project
  }
  _.remove(members, ['name', username])
  const body = {
    spec: {
      members
    }
  }
  return projects.mergePatch({ name: project.metadata.name, body })
}

// list, create and remove is done with the user
exports.list = async function ({ user, namespace }) {
  const projects = Garden(user).projects
  const namespaces = Core(user).namespaces

  const project = await getProjectByNamespace(projects, namespaces, namespace)

  // get project members from project
  return fromResource(project)
}

exports.get = async function ({ user, namespace, name: username }) {
  const projects = Garden(user).projects
  const namespaces = Core(user).namespaces

  const project = await getProjectByNamespace(projects, namespaces, namespace)

  const projectName = project.metadata.name

  // find member of project
  const member = _.find(project.spec.members, {
    name: username,
    kind: 'User'
  })
  if (!member) {
    throw new NotFound(`User ${username} is not a member of project ${projectName}`)
  }
  const [, serviceAccountNamespace, serviceAccountName] = /^system:serviceaccount:([^:]+):([^:]+)$/.exec(username) || []
  if (serviceAccountNamespace === namespace) {
    const core = Core(user)
    const ns = core.namespaces(namespace)
    const serviceaccount = await ns.serviceaccounts.get({
      name: serviceAccountName
    })
    const api = ns.serviceaccounts.api
    const server = _.get(config, 'apiServerUrl', api.url)
    const secret = await ns.secrets.get({
      name: _.first(serviceaccount.secrets).name
    })
    const token = decodeBase64(secret.data.token)
    const caData = secret.data['ca.crt']
    const clusterName = 'garden'
    const contextName = `${clusterName}-${projectName}-${username}`
    member.kind = 'ServiceAccount'
    member.kubeconfig = kubernetes.getKubeconfigFromServiceAccount({ serviceAccountName, contextName, contextNamespace: serviceAccountNamespace, token, caData, server })
  }
  return member
}

exports.create = async function ({ user, namespace, body: { name: username } }) {
  const [, serviceaccountNamespace, serviceaccountName] = /^system:serviceaccount:([^:]+):([^:]+)$/.exec(username) || []
  const core = Core(user)
  if (serviceaccountNamespace === namespace) {
    await createServiceaccount(core, serviceaccountNamespace, serviceaccountName)
  }
  const projects = Garden(user).projects
  const namespaces = core.namespaces

  // assign user to project
  const project = await setProjectMember(projects, namespaces, namespace, username)
  return fromResource(project)
}

exports.remove = async function ({ user, namespace, name: username }) {
  const projects = Garden(user).projects
  const namespaces = Core(user).namespaces

  // unassign user from project
  const project = await unsetProjectMember(projects, namespaces, namespace, username)
  const [, serviceaccountNamespace, serviceaccountName] = /^system:serviceaccount:([^:]+):([^:]+)$/.exec(username) || []
  if (serviceaccountNamespace === namespace) {
    const namespaces = Core(user).namespaces
    await deleteServiceaccount(namespaces, serviceaccountNamespace, serviceaccountName)
  }
  return fromResource(project)
}
