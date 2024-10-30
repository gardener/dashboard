//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { PassThrough } = require('stream')
const { cloneDeep, merge, get, set, filter, find, includes, intersection, split } = require('lodash')
const createError = require('http-errors')
const pathToRegexp = require('path-to-regexp')

const { delay, parseFieldSelector } = require('./helper')
const { getTokenPayload } = require('./auth')

function createUser (member) {
  const name = member.name || member
  const user = {
    apiGroup: 'rbac.authorization.k8s.io',
    kind: 'User',
    name,
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
    resourceVersion,
  }
  if (uid) {
    metadata.uid = uid
  }
  if (costObject) {
    set(metadata, ['annotations', 'billing.gardener.cloud/costObject'], costObject)
    set(metadata, ['annotations', 'billing.gardener.cloud/costObjectType'], 'CO')
  }
  return {
    metadata,
    spec: {
      namespace,
      createdBy,
      owner,
      members,
      purpose,
      description,
    },
    status: {
      phase,
    },
  }
}

const projectList = [
  getProject({
    uid: 0,
    name: 'garden',
    namespace: 'garden',
    createdBy: 'admin@example.org',
    owner: 'admin@example.org',
  }),
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
        roles: ['admin'],
      },
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'bar@example.org',
        roles: ['admin', 'owner'],
      },
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'system:serviceaccount:garden-foo:robot',
        roles: ['viewer'],
      },
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'system:serviceaccount:garden-baz:robot',
        roles: ['viewer', 'admin'],
      },
    ],
    description: 'foo-description',
    purpose: 'foo-purpose',
    costObject: '9999999999',
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
        roles: ['admin', 'owner'],
      },
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'system:serviceaccount:garden-foo:robot',
        roles: ['viewer', 'admin'],
      },
    ],
    description: 'bar-description',
    purpose: 'bar-purpose',
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
        roles: ['admin', 'owner'],
      },
    ],
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
        roles: ['admin', 'owner'],
      },
    ],
  }),
  getProject({
    uid: 5,
    name: 'pending',
    createdBy: 'admin@example.org',
    description: 'pending-description',
    purpose: 'pending-purpose',
    phase: 'Pending',
  }),
  getProject({
    uid: 6,
    name: 'secret',
    createdBy: 'admin@example.org',
    members: [
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'ServiceAccount',
        namespace: 'garden-bar',
        name: 'robot',
        roles: ['viewer'],
      },
    ],
    description: 'secret-description',
    purpose: 'secret-purpose',
  }),
  getProject({
    uid: 7,
    name: 'trial',
    createdBy: 'admin@example.org',
    description: 'trial-description',
    purpose: 'trial-purpose',
    costObject: '1234567890',
    phase: 'Failed',
  }),
]

const projects = {
  items: [...projectList],
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
    const members = get(item, ['spec', 'members'], [])
    const userList = [
      'admin@example.org',
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
    return cloneDeep(this.items)
  },
  reset () {
    this.items = [...projectList]
  },
}

const matchOptions = { decode: decodeURIComponent }
const matchList = pathToRegexp.match('/apis/core.gardener.cloud/v1beta1/projects', matchOptions)
const matchItem = pathToRegexp.match('/apis/core.gardener.cloud/v1beta1/projects/:name', matchOptions)

const mocks = {
  list () {
    return headers => {
      const matchResult = matchList(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const items = projects.list()
      return Promise.resolve({ items })
    }
  },
  create ({ uid = 21, resourceVersion = '42', phase = 'Ready' } = {}) {
    return (headers, json) => {
      const matchResult = matchList(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const payload = getTokenPayload(headers)
      const item = cloneDeep(json)
      const name = json.metadata.name
      const user = createUser(payload.id)
      set(item, ['metadata', 'resourceVersion'], resourceVersion)
      set(item, ['metadata', 'uid'], uid)
      set(item, ['spec', 'namespace'], `garden-${name}`)
      set(item, ['spec', 'createdBy'], user)
      set(item, ['spec', 'owner'], user)
      set(item, ['spec', 'members'], [{
        ...user,
        role: 'owner',
        roles: ['admin', 'uam'],
      }])
      set(item, ['status', 'phase'], 'Initial')
      projects.items.push(item)
      return Promise.resolve(item)
    }
  },
  watch ({ phase = 'Ready', end = false, milliseconds } = {}) {
    return headers => {
      const [pathname] = split(headers[':path'], '?')
      const matchResult = matchList(pathname)
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const fieldSelector = parseFieldSelector(headers)
      const stream = new PassThrough({ objectMode: true })
      process.nextTick(async () => {
        const items = filter(projects.list(), fieldSelector)
        for (const item of items) {
          stream.write({ type: 'ADDED', object: item })
        }
        await delay(milliseconds)
        const initialItems = filter(items, ['status.phase', 'Initial'])
        for (const oldItem of initialItems) {
          const item = cloneDeep(oldItem)
          const resourceVersion = get(item, ['metadata', 'resourceVersion'], '42')
          set(item, ['status', 'phase'], phase)
          set(item, ['metadata', 'resourceVersion'], (+resourceVersion + 1).toString())
          stream.write({ type: 'MODIFIED', object: item })
        }
        if (end === true) {
          stream.end()
        }
      })
      return stream
    }
  },
  get () {
    return headers => {
      const matchResult = matchItem(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { name } = {} } = matchResult
      const payload = getTokenPayload(headers)
      const item = projects.get(name)
      if (!projects.isMember(item, payload)) {
        return Promise.reject(createError(403))
      }
      return Promise.resolve(item)
    }
  },
  patch () {
    return (headers, json) => {
      const matchResult = matchItem(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { name } = {} } = matchResult
      const item = projects.get(name)
      const resourceVersion = get(item, ['metadata', 'resourceVersion'], '42')
      merge(item, json)
      set(item, ['metadata', 'resourceVersion'], (+resourceVersion + 1).toString())
      return Promise.resolve(item)
    }
  },
  delete () {
    return headers => {
      const matchResult = matchItem(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { params: { name } = {} } = matchResult
      const item = projects.get(name)
      return Promise.resolve(item)
    }
  },
}

module.exports = {
  ...projects,
  mocks,
}
