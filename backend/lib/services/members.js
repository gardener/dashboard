//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
const { decodeBase64, joinMemberRoleAndRoles, splitMemberRolesIntoRoleAndRoles, parseUsernameToMember } = require('../utils')
const { isHttpError } = require('../kubernetes-client')
const { dumpKubeconfig } = require('../kubernetes-config')
const { Conflict, NotFound } = require('../errors.js')
const cache = require('../cache')

function normalizedMembersFromProject (project) {
  const normalizedMember = ({ kind, name, namespace, role, roles }) => {
    if (kind === 'ServiceAccount' && name && namespace) {
      name = toServiceAccountName(name, namespace)
    }
    roles = joinMemberRoleAndRoles(role, roles)
    return { username: name, roles }
  }

  const normalizedMemberRoles = (members, username) => {
    const roles = _
      .chain(members)
      .flatMap('roles')
      .uniq()
      .value()
    return { username, roles }
  }

  return _
    .chain(project)
    .get('spec.members')
    .map(normalizedMember)
    .groupBy('username')
    .mapValues(normalizedMemberRoles)
    .values()
    .value()
}

exports.normalizedMembersFromProject = normalizedMembersFromProject

function toServiceAccountName (name, namespace) {
  if (hasServiceAccountPrefix(name)) {
    return name
  }
  return `system:serviceaccount:${namespace}:${name}`
}

function hasServiceAccountPrefix (name) {
  return _.startsWith(name, 'system:serviceaccount:')
}

function memberPredicate (name) {
  return member => {
    if (hasServiceAccountPrefix(name)) {
      const serviceAccountMember = parseUsernameToMember(name)
      return (member.kind === 'User' && member.name === name) || (member.kind === 'ServiceAccount' && member.name === serviceAccountMember.name && member.namespace === serviceAccountMember.namespace)
    } else {
      return member.kind === 'User' && member.name === name
    }
  }
}

function fromResource (project = {}, serviceAccounts = []) {
  const serviceAccountsMetadata = _
    .chain(serviceAccounts)
    .map(({ metadata }) => ({
      username: toServiceAccountName(metadata.name, metadata.namespace),
      createdBy: _.get(metadata, ['annotations', 'garden.sapcloud.io/createdBy']),
      creationTimestamp: metadata.creationTimestamp,
      roles: []
    }))
    .value()
  const normalizedMembers = normalizedMembersFromProject(project)
  const noMemberServiceAccounts = _.differenceBy(serviceAccountsMetadata, normalizedMembers, 'username')

  return [...normalizedMembers, ...noMemberServiceAccounts]
}

function readProject (client, namespace) {
  const project = cache.findProjectByNamespace(namespace)
  return client['core.gardener.cloud'].projects.get(project.metadata.name)
}

function createServiceaccount (client, { namespace, name, createdBy }) {
  const body = {
    metadata: {
      name,
      namespace,
      annotations: {
        'garden.sapcloud.io/createdBy': createdBy
      }
    }
  }
  return client.core.serviceaccounts.create(namespace, body)
}

async function deleteServiceaccount (client, { namespace, name }) {
  try {
    return client.core.serviceaccounts.delete(namespace, name)
  } catch (err) {
    if (isHttpError(err, [404, 410])) {
      return { metadata: { name, namespace } }
    }
    throw err
  }
}

// Adds or updates member, makes sure that a member occurs only once in the list and
// migrates ServiceAccounts into kind ServiceAccount
const updateMemberInNotNormalizedProjectMemberList = function (memberName, memberRoles, memberList) {
  // Gardener wants to have a role for backward compatibility...
  const { role, roles } = splitMemberRolesIntoRoleAndRoles(memberRoles)

  // First remove all occurrences, we need this to clean up as a member might has multiple entries
  _.remove(memberList, memberPredicate(memberName))

  if (!memberRoles.length) {
    return
  }

  const member = parseUsernameToMember(memberName)
  memberList.push({
    ...member,
    role,
    roles
  })
}

exports.updateMemberInNotNormalizedProjectMemberList = updateMemberInNotNormalizedProjectMemberList

async function setProjectMember (client, { namespace, name, roles }) {
  // get project
  const project = await readProject(client, namespace)
  // get project members from project
  const members = [...project.spec.members]

  const member = _.find(members, memberPredicate(name))
  if (member) {
    throw new Conflict(`'${name}' is already member of this project`)
  }

  updateMemberInNotNormalizedProjectMemberList(name, roles, members)

  const body = {
    spec: {
      members
    }
  }
  return client['core.gardener.cloud'].projects.mergePatch(project.metadata.name, body)
}

async function updateProjectMemberRoles (client, { namespace, name, roles }) {
  // get project
  const project = await readProject(client, namespace)
  // get project members from project
  const members = [...project.spec.members]

  const member = _.find(members, memberPredicate(name))
  if (!hasServiceAccountPrefix(name) && !member) {
    // Users need to exist, ServiceAccount will be created on demand
    throw new NotFound(`User '${name}' is not a member of this project`)
  }

  updateMemberInNotNormalizedProjectMemberList(name, roles, members)

  const body = {
    spec: {
      members
    }
  }

  return client['core.gardener.cloud'].projects.mergePatch(project.metadata.name, body)
}

async function unsetProjectMember (client, { namespace, name }) {
  // get project
  const project = await readProject(client, namespace)
  // get project members from project
  const members = [...project.spec.members]

  const member = _.find(members, memberPredicate(name))
  if (!member) {
    return project
  }

  _.remove(members, memberPredicate(name))

  const body = {
    spec: {
      members
    }
  }
  return client['core.gardener.cloud'].projects.mergePatch(project.metadata.name, body)
}

// list, create and remove is done with the user
exports.list = async function ({ user, namespace }) {
  const client = user.client

  // get project
  const project = await readProject(client, namespace)

  // list serviceAccounts
  const { items: serviceAccounts } = await client.core.serviceaccounts.list(namespace)

  // get project members from project
  return fromResource(project, serviceAccounts)
}

exports.get = async function ({ user, namespace, name }) {
  const client = user.client

  // get project
  const project = await readProject(client, namespace)

  // get project members from project
  const normalizedMembers = normalizedMembersFromProject(project)

  const normalizedMember = _.find(normalizedMembers, { username: name })
  if (!hasServiceAccountPrefix(name) && !normalizedMembers) {
    // Users need to exist, ServiceAccount will be created on demand
    throw new NotFound(`User '${name}' is not a member of this project`)
  }

  if (hasServiceAccountPrefix(name)) {
    const serviceAccountMember = parseUsernameToMember(name)
    if (serviceAccountMember.namespace === namespace) {
      const projectName = project.metadata.name
      const serviceAccount = await client.core.serviceaccounts.get(namespace, serviceAccountMember.name)
      const server = config.apiServerUrl
      const secretName = _.first(serviceAccount.secrets).name
      const secret = await client.core.secrets.get(namespace, secretName)
      const token = decodeBase64(secret.data.token)
      const caData = secret.data['ca.crt']
      const clusterName = 'garden'
      const contextName = `${clusterName}-${projectName}-${name}`

      const kubeconfig = dumpKubeconfig({
        user: serviceAccountMember.name,
        context: contextName,
        cluster: clusterName,
        namespace: serviceAccountMember.namespace,
        token,
        server,
        caData
      })
      if (normalizedMember) {
        return {
          ...normalizedMember,
          kubeconfig
        }
      }
      return {
        username: name,
        kubeconfig
      }
    }
  }
  return normalizedMember
}

exports.create = async function ({ user, namespace, body: { name, roles } }) {
  const client = user.client

  const { items: serviceAccounts } = await client.core.serviceaccounts.list(namespace)

  const member = parseUsernameToMember(name)
  if (member.kind === 'ServiceAccount') {
    if (member.namespace === namespace && !_.find(serviceAccounts, { metadata: { namespace: member.namespace, name: member.name } })) {
      await createServiceaccount(client, {
        namespace: member.namespace,
        name: member.name,
        createdBy: user.id
      })
    }
  }

  // assign user to project
  let project
  if (roles.length) { // service account can be created without roles
    project = await setProjectMember(client, { namespace, name, roles })
  } else {
    project = await readProject(client, namespace)
  }

  return fromResource(project, serviceAccounts)
}

exports.update = async function ({ user, namespace, name, body: { roles } }) {
  const client = user.client

  // update user in project
  const project = await updateProjectMemberRoles(client, { namespace, name, roles })
  const { items: serviceAccounts } = await client.core.serviceaccounts.list(namespace)
  return fromResource(project, serviceAccounts)
}

exports.remove = async function ({ user, namespace, name }) {
  const client = user.client

  // unassign user from project
  const project = await unsetProjectMember(client, { namespace, name })

  const member = parseUsernameToMember(name)
  if (member.kind === 'ServiceAccount') {
    if (member.namespace === namespace) {
      await deleteServiceaccount(client, {
        namespace,
        name: member.name
      })
    }
  }

  const { items: serviceAccounts } = await client.core.serviceaccounts.list(namespace)
  return fromResource(project, serviceAccounts)
}
