//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { cloneDeep, merge, get, set, find, includes, intersection } = require('lodash')
const createError = require('http-errors')
const pathToRegexp = require('path-to-regexp')
const { getMockWatch } = require('@gardener-dashboard/kube-client')

const { nextTick } = require('./helper')
const { getTokenPayload } = require('./auth')

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

function getProject ({ name, namespace, uid, resourceVersion = '42', createdBy, owner, members = [], description, purpose, phase = 'Ready', costObject }) {
  owner = owner || createdBy
  namespace = namespace || `garden-${name}`
  members.forEach(setRoleAndRoles)
  owner = createUser(owner)
  createdBy = createUser(createdBy)
  const metadata = {
    name,
    resourceVersion
  }
  if (uid) {
    metadata.uid = uid
  }
  if (costObject) {
    set(metadata, 'annotations["billing.gardener.cloud/costObject"]', costObject)
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
    uid: 1,
    name: 'foo',
    createdBy: 'foo@example.org',
    owner: 'bar@example.org',
    members: [
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'foo@example.org',
        roles: ['admin']
      },
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'bar@example.org',
        roles: ['admin', 'owner']
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
    uid: 2,
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
    uid: 3,
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
    uid: 4,
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
    uid: 5,
    name: 'initial',
    createdBy: 'admin@example.org',
    description: 'initial-description',
    purpose: 'initial-purpose',
    phase: 'Initial'
  }),
  getProject({
    uid: 6,
    name: 'secret',
    createdBy: 'admin@example.org',
    description: 'secret-description',
    purpose: 'secret-purpose'
  }),
  getProject({
    uid: 7,
    name: 'trial',
    createdBy: 'admin@example.org',
    description: 'trial-description',
    purpose: 'trial-purpose',
    costObject: '1234567890'
  })
]

const projects = {
  create (options) {
    return getProject(options)
  },
  get (name) {
    return find(projects.list(), { metadata: { name } })
  },
  getByNamespace (namespace) {
    return find(projects.list(), { spec: { namespace } })
  },
  isMember (item, { id, groups = [] }) {
    if (typeof item === 'string') {
      if (/garden/.test(item)) {
        item = projects.getByNamespace(item)
      } else {
        item = projects.get(item)
      }
    }
    const members = get(item, 'spec.members', [])
    const userList = [
      'admin@example.org'
    ]
    const groupList = []
    for (const { kind, namespace, name } of members) {
      switch (kind) {
        case 'User':
          userList.push(name)
          break
        case 'ServiceAccount':
          userList.push(`system:serviceaccount:${namespace}:${name}`)
          break
        case 'Group':
          groupList.push(name)
          break
      }
    }
    return includes(userList, id) || intersection(groupList, groups).length
  },
  list () {
    return cloneDeep(projectList)
  }
}

module.exports = {
  ...projects,
  mocks: {
    list () {
      // eslint-disable-next-line no-unused-vars
      const path = '/apis/core.gardener.cloud/v1beta1/projects'
      return () => {
        const items = projects.list()
        return Promise.resolve({ items })
      }
    },
    create ({ uid = 21, resourceVersion = '42', phase = 'Ready' } = {}) {
      const path = '/apis/core.gardener.cloud/v1beta1/projects'
      return (headers, json) => {
        const payload = getTokenPayload(headers)
        const item = cloneDeep(json)
        const name = json.metadata.name
        const user = createUser(payload.id)
        set(item, 'metadata.resourceVersion', resourceVersion)
        set(item, 'metadata.uid', uid)
        set(item, 'spec.namespace', `garden-${name}`)
        set(item, 'spec.createdBy', user)
        set(item, 'spec.owner', user)
        set(item, 'spec.members', [{
          ...user,
          role: 'owner',
          roles: ['admin', 'uam']
        }])
        set(item, 'status.phase', 'Initial')
        ;(async () => {
          try {
            const key = [path, name].join('/')
            const mockWatch = await getMockWatch(key)
            // emit ADDED
            await nextTick()
            let object = cloneDeep(item)
            mockWatch.emit('event', { type: 'ADDED', object })
            // emit MODIFIED
            await nextTick()
            object = cloneDeep(item)
            set(object, 'metadata.resourceVersion', (+resourceVersion + 1).toString())
            set(object, 'status.phase', phase)
            mockWatch.emit('event', { type: 'MODIFIED', object })
          } catch (err) { /* ignore error */ }
        })()
        return Promise.resolve(item)
      }
    },
    get () {
      const path = '/apis/core.gardener.cloud/v1beta1/projects/:name'
      const match = pathToRegexp.match(path, { decode: decodeURIComponent })
      return headers => {
        const { params: { name } = {} } = match(headers[':path']) || {}
        const payload = getTokenPayload(headers)
        const item = projects.get(name)
        if (!projects.isMember(item, payload)) {
          return Promise.reject(createError(403))
        }
        return Promise.resolve(item)
      }
    },
    patch () {
      const path = '/apis/core.gardener.cloud/v1beta1/projects/:name'
      const match = pathToRegexp.match(path, { decode: decodeURIComponent })
      return (headers, json) => {
        const { params: { name } = {} } = match(headers[':path']) || {}
        const item = projects.get(name)
        const resourceVersion = get(item, 'metadata.resourceVersion', '42')
        merge(item, json)
        set(item, 'metadata.resourceVersion', (+resourceVersion + 1).toString())
        return Promise.resolve(item)
      }
    },
    delete () {
      const path = '/apis/core.gardener.cloud/v1beta1/projects/:name'
      const match = pathToRegexp.match(path, { decode: decodeURIComponent })
      return headers => {
        const { params: { name } = {} } = match(headers[':path']) || {}
        const item = projects.get(name)
        return Promise.resolve(item)
      }
    }
  }
}
