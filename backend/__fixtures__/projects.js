//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { uuidv1 } = require('./helper')
const { cloneDeep } = require('lodash')

function createUser (member) {
  const name = member.name || member
  const user = {
    apiGroup: 'rbac.authorization.k8s.io',
    kind: 'User',
    name
  }
  return user
}

function setRoleAndRoles (member) {
  const [role, ...roles] = member.roles
  member.role = role
  member.roles = roles
}

function getProject ({ name, namespace, createdBy, owner, members = [], description, purpose, phase = 'Ready', costObject = '' }) {
  owner = owner || createdBy
  namespace = namespace || `garden-${name}`
  members.forEach(setRoleAndRoles)
  owner = createUser(owner)
  createdBy = createUser(createdBy)
  const metadata = {
    name,
    annotations: {
      'billing.gardener.cloud/costObject': costObject
    },
    uid: uuidv1()
  }
  return {
    metadata,
    spec: {
      namespace,
      createdBy,
      owner,
      members,
      purpose,
      description
    },
    status: {
      phase
    }
  }
}

const projectList = [
  getProject({
    name: 'foo',
    createdBy: 'bar@example.org',
    owner: 'foo@example.org',
    members: [
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'foo@example.org',
        roles: ['admin', 'owner']
      },
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'bar@example.org',
        roles: ['admin']
      },
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'system:serviceaccount:garden-foo:robot',
        roles: ['viewer']
      },
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'system:serviceaccount:garden-baz:robot',
        roles: ['viewer', 'admin']
      }
    ],
    description: 'foo-description',
    purpose: 'foo-purpose',
    costObject: '9999999999'
  }),
  getProject({
    name: 'bar',
    createdBy: 'foo@example.org',
    owner: 'bar@example.org',
    members: [
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'foo@example.org',
        roles: ['admin', 'owner']
      },
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'system:serviceaccount:garden-foo:robot',
        roles: ['viewer', 'admin']
      }
    ],
    description: 'bar-description',
    purpose: 'bar-purpose'
  }),
  getProject({
    name: 'GroupMember1',
    createdBy: 'new@example.org',
    owner: 'new@example.org',
    members: [
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'Group',
        name: 'group1',
        roles: ['admin', 'owner']
      }
    ]
  }),
  getProject({
    name: 'GroupMember2',
    createdBy: 'new@example.org',
    owner: 'new@example.org',
    members: [
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'Group',
        name: 'group2',
        roles: ['admin', 'owner']
      }
    ]
  }),
  getProject({
    name: 'new',
    createdBy: 'new@example.org',
    description: 'new-description',
    purpose: 'new-purpose',
    phase: 'Initial'
  }),
  getProject({
    name: 'secret',
    createdBy: 'admin@example.org',
    description: 'secret-description',
    purpose: 'secret-purpose'
  }),
  getProject({
    name: 'trial',
    createdBy: 'admin@example.org',
    description: 'trial-description',
    purpose: 'trial-purpose',
    costObject: '1234567890'
  })
]

module.exports = {
  create (...args) {
    return getProject(...args)
  },
  list () {
    return cloneDeep(projectList)
  }
}
