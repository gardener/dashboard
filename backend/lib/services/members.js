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
const { decodeBase64, joinMemberRoleAndRoles, splitMemberRolesIntoRoleAndRoles } = require('../utils')
const { isHttpError } = require('../kubernetes-client')
const { dumpKubeconfig } = require('../kubernetes-config')
const { Conflict, NotFound } = require('../errors.js')
const cache = require('../cache')
const { uniq } = require('lodash')

function toServiceAccountName (name, namespace) {
  if (hasServiceAccountPrefix(name)) {
    return name
  }
  return `system:serviceaccount:${namespace}:${name}`
}

function hasServiceAccountPrefix(name) {
  return _.startsWith(name, 'system:serviceaccount:')
}

function prefixedServiceAccountToComponents (name) {
  if (name) {
    const [, serviceAccountNamespace, serviceAccountName] = /^system:serviceaccount:([^:]+):([^:]+)$/.exec(name) || []
    return { serviceAccountNamespace, serviceAccountName }
  }
  return {}
}

function memberFromMembers(members, name) {
  if (hasServiceAccountPrefix(name)) {
    const { serviceAccountNamespace, serviceAccountName } = prefixedServiceAccountToComponents(name)
    return _.find(members, { name, kind: 'User' }) || _.find(members, { name: serviceAccountName, namespace: serviceAccountNamespace, kind: 'ServiceAccount' })
  } else {
    return _.find(members, { name, kind: 'User' })
  }
}

function toUserName(name, namespace, kind) {
  if (kind === 'ServiceAccount' && !hasServiceAccountPrefix(name)) {
    return toServiceAccountName(name, namespace)
  }
  return name
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

  const members = _
    .chain(project)
    .get('spec.members')
    .map(({ name, namespace, kind, role, roles }) => {
      const username = toUserName(name, namespace, kind)
      return {
        username,
        roles: joinMemberRoleAndRoles(role, roles),
        ...serviceAccountsMetadata[username]
      }
    })
    .value()

  const noMemberServiceAccounts = _.differenceBy(serviceAccountsMetadata, members, 'username')

  return [...members, ...noMemberServiceAccounts]

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

async function setProjectMember (client, { namespace, name, roles: memberRoles }) {
  // get project
  const project = await readProject(client, namespace)
  // get project members from project
  const members = [...project.spec.members]

  // Gardener wants to have a role for backward compatibility...
  const { role, roles } = splitMemberRolesIntoRoleAndRoles(memberRoles)

  const member = memberFromMembers(members, name)
  if (!member) {
    throw new Conflict(`'${name}' is already member of this project`)
  }
  if (hasServiceAccountPrefix(name)) {
    members.push({
      kind: 'ServiceAccount',
      name: serviceAccountName,
      namespace: serviceAccountNamespace,
      role,
      roles
    })
  } else {
    members.push({
      kind: 'User',
      name,
      apiGroup: 'rbac.authorization.k8s.io',
      role,
      roles
    })
  }

  const body = {
    spec: {
      members
    }
  }
  return client['core.gardener.cloud'].projects.mergePatch(project.metadata.name, body)
}

async function updateProjectMemberRoles (client, { namespace, name, roles: memberRoles }) {
  // get project
  const project = await readProject(client, namespace)
  // get project members from project
  const members = [...project.spec.members]

  const { role, roles } = splitMemberRolesIntoRoleAndRoles(memberRoles)

  let member = _.find(members, { name, kind: 'User' })
  if (hasServiceAccountPrefix(name)) {
    const { serviceAccountNamespace, serviceAccountName } = prefixedServiceAccountToComponents(name)
    if (member) {
      // Service Account set as User => remove
      _.remove(members, member)
    }
    member = _.find(members, { name: serviceAccountName, namespace: serviceAccountNamespace, kind: 'ServiceAccount' })
    if (member && !memberRoles.length) {
      // Removed all roles from Service Account => delete from member list
      _.remove(members, member)
    } else if (!member) { // Not a ServiceAccount member (yet) =>add
      member = {
        kind: 'ServiceAccount',
        name: serviceAccountName,
        namespace: serviceAccountNamespace,
        role,
        roles
      }
      members.push(member)
    }
  }

  if (!member) {
    throw new NotFound(`User '${name}' is not a member of this project`)
  }
  _.assign(member, { role, roles })

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

  const member = memberFromMembers(members, name)
  if (!member) {
    return project
  }
  _.remove(members, member)
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
  const members = [...project.spec.members]

  const projectName = project.metadata.name

  // find member of project
  let member
  if (hasServiceAccountPrefix(name)) {
    const { serviceAccountNamespace, serviceAccountName } = prefixedServiceAccountToComponents(name)
    member =  _.find(members, { name, kind: 'User' }) || _.find(members, { name: serviceAccountName, namespace: serviceAccountNamespace, kind: 'ServiceAccount' })
  } else{
    member = _.find(members, {
      name,
      kind: 'User'
    })
  }
  if (!member) {
    throw new NotFound(`User ${name} is not a member of project ${projectName}`)
  }

  if (hasServiceAccountPrefix(name)) {
    const { serviceAccountNamespace, serviceAccountName } = prefixedServiceAccountToComponents(name)
    if (serviceAccountNamespace === namespace) {
      const serviceaccount = await client.core.serviceaccounts.get(namespace, serviceAccountName)
      const server = config.apiServerUrl
      const secretName = _.first(serviceaccount.secrets).name
      const secret = await client.core.secrets.get(namespace, secretName)
      const token = decodeBase64(secret.data.token)
      const caData = secret.data['ca.crt']
      const clusterName = 'garden'
      const contextName = `${clusterName}-${projectName}-${name}`

      const kind = 'ServiceAccount'
      const kubeconfig = dumpKubeconfig({
        user: serviceAccountName,
        context: contextName,
        cluster: clusterName,
        namespace: serviceAccountNamespace,
        token,
        server,
        caData
      })
      return {
        ...member,
        kind,
        kubeconfig
      }
    }
  }
  return member
}

exports.create = async function ({ user, namespace, body: { name, roles } }) {
  const client = user.client

  if (hasServiceAccountPrefix(name)) {
    const { serviceAccountNamespace, serviceAccountName } = prefixedServiceAccountToComponents(name)
    if (serviceAccountNamespace === namespace) {
      await createServiceaccount(client, {
        namespace: serviceAccountNamespace,
        name: serviceAccountName,
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

  const { items: serviceAccounts } = await client.core.serviceaccounts.list(namespace)


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

  if (hasServiceAccountPrefix(name)) {
    const { serviceAccountNamespace, serviceAccountName } = prefixedServiceAccountToComponents(name)
    if (serviceAccountNamespace === namespace) {
      await deleteServiceaccount(client, {
        namespace,
        name: serviceAccountName
      })
    }
  }

  const { items: serviceAccounts } = await client.core.serviceaccounts.list(namespace)
  return fromResource(project, serviceAccounts)
}
