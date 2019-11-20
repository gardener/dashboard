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
const { decodeBase64 } = require('../utils')
const { isHttpError } = require('../kubernetes-client')
const { dumpKubeconfig } = require('../kubeconfig')
const { Conflict, NotFound } = require('../errors.js')

function toServiceAccountName ({ metadata: { name, namespace } }) {
  return `system:serviceaccount:${namespace}:${name}`
}

function fromResource (project = {}, serviceAccounts = []) {
  const serviceAccountsMetadata = _
    .chain(serviceAccounts)
    .map(serviceAccount => [
      toServiceAccountName(serviceAccount),
      {
        createdBy: _.get(serviceAccount, ['metadata', 'annotations', 'garden.sapcloud.io/createdBy']),
        creationTimestamp: serviceAccount.metadata.creationTimestamp
      }
    ])
    .fromPairs()
    .value()

  return _
    .chain(project)
    .get('spec.members')
    .filter(['kind', 'User'])
    .map('name')
    .map(username => ({
      username,
      ...serviceAccountsMetadata[username]
    }))
    .value()
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
  return client.core.serviceaccounts.create({ namespace, json: body })
}

async function deleteServiceaccount (client, { namespace, name }) {
  try {
    return client.core.serviceaccounts.delete({ namespace, name })
  } catch (err) {
    if (isHttpError(err, [404, 410])) {
      return { metadata: { name, namespace } }
    }
    throw err
  }
}

async function setProjectMember (client, { namespace, name }) {
  // get project
  const project = await client.getProjectByNamespace(namespace)
  // get project members from project
  const members = _.slice(project.spec.members, 0)
  if (_.find(members, ['name', name])) {
    throw new Conflict(`User '${name}' is already member of this project`)
  }
  members.push({
    kind: 'User',
    name,
    apiGroup: 'rbac.authorization.k8s.io'
  })
  const body = {
    spec: {
      members
    }
  }
  return client['core.gardener.cloud'].projects.patch({
    type: 'merge',
    namespace,
    name: project.metadata.name,
    json: body
  })
}

async function unsetProjectMember (client, { namespace, name }) {
  // get project
  const project = await client.getProjectByNamespace(namespace)
  // get project members from project
  const members = _.slice(project.spec.members, 0)
  if (!_.find(members, ['name', name])) {
    return project
  }
  _.remove(members, ['name', name])
  const body = {
    spec: {
      members
    }
  }
  return client['core.gardener.cloud'].projects.patch({
    type: 'merge',
    namespace,
    name: project.metadata.name,
    json: body
  })
}

// list, create and remove is done with the user
exports.list = async function ({ user, namespace }) {
  const client = user.api

  const project = await client.getProjectByNamespace(namespace)
  const { items: serviceAccounts } = await client.core.serviceaccounts.get({ namespace })

  // get project members from project
  return fromResource(project, serviceAccounts)
}

exports.get = async function ({ user, namespace, name }) {
  const client = user.api

  const project = await client.getProjectByNamespace(namespace)

  const projectName = project.metadata.name

  // find member of project
  const member = _.find(project.spec.members, {
    name,
    kind: 'User'
  })
  if (!member) {
    throw new NotFound(`User ${name} is not a member of project ${projectName}`)
  }
  const [, serviceAccountNamespace, serviceAccountName] = /^system:serviceaccount:([^:]+):([^:]+)$/.exec(name) || []
  if (serviceAccountNamespace === namespace) {
    const serviceaccount = await client.core.serviceaccounts.get({
      namespace,
      name: serviceAccountName
    })
    const server = client.cluster.server.toString()
    const secretName = _.first(serviceaccount.secrets).name
    const secret = await client.core.secrets.get({
      namespace,
      name: secretName
    })
    const token = decodeBase64(secret.data.token)
    const caData = secret.data['ca.crt']
    const clusterName = 'garden'
    const contextName = `${clusterName}-${projectName}-${name}`
    member.kind = 'ServiceAccount'
    member.kubeconfig = dumpKubeconfig({
      user: serviceAccountName,
      context: contextName,
      cluster: clusterName,
      namespace: serviceAccountNamespace,
      token,
      server,
      caData
    })
  }
  return member
}

exports.create = async function ({ user, namespace, body: { name } }) {
  const client = user.api

  const [, serviceaccountNamespace, serviceaccountName] = /^system:serviceaccount:([^:]+):([^:]+)$/.exec(name) || []
  if (serviceaccountNamespace === namespace) {
    await createServiceaccount(client, {
      namespace: serviceaccountNamespace,
      name: serviceaccountName,
      createdBy: user.id
    })
  }

  // assign user to project
  const project = await setProjectMember(client, { namespace, name })
  const { items: serviceAccounts } = await client.core.serviceaccounts.get({ namespace })
  return fromResource(project, serviceAccounts)
}

exports.remove = async function ({ user, namespace, name }) {
  const client = user.api

  // unassign user from project
  const project = await unsetProjectMember(client, { namespace, name })
  const [, serviceaccountNamespace, serviceaccountName] = /^system:serviceaccount:([^:]+):([^:]+)$/.exec(name) || []
  if (serviceaccountNamespace === namespace) {
    await deleteServiceaccount(client, {
      namespace,
      name: serviceaccountName
    })
  }

  const { items: serviceAccounts } = await client.core.serviceaccounts.get({ namespace })
  return fromResource(project, serviceAccounts)
}
