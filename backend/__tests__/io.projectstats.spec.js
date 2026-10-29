//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

vi.mock('../lib/services/authorization.js', () => ({
  canListProjects: vi.fn(),
  canListResourceQuotas: vi.fn(),
  canListShoots: vi.fn(),
}))

vi.mock('../lib/services/projectstats.js', () => ({
  getByUids: vi.fn(),
  resolveProjectStatScope: vi.fn(),
}))

const authorization = await import('../lib/services/authorization.js')
const projectstats = await import('../lib/services/projectstats.js')
const {
  subscribe,
  synchronize,
  unsubscribe,
} = await import('../lib/io/projectstats.js')

describe('io/projectstats', () => {
  const user = {
    id: 'user@example.org',
    groups: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('joins the global room for users with global ProjectStat access', async () => {
    projectstats.resolveProjectStatScope.mockResolvedValue(createProjectStatScope({
      canListAllProjectStats: true,
    }))
    const socket = createSocket(user)

    await subscribe(socket)

    expect(projectstats.resolveProjectStatScope).toHaveBeenCalledExactlyOnceWith(user)
    expect(socket.join).toHaveBeenCalledExactlyOnceWith(['projectstats:all'])
    expect(socket.data.projectStatsSubscribed).toBe(true)
  })

  it('joins only the authorized namespace rooms for scoped users', async () => {
    projectstats.resolveProjectStatScope.mockResolvedValue(createProjectStatScope({
      projectStatNamespaces: new Set(['garden-foo', 'garden-bar']),
    }))
    const socket = createSocket(user)

    await subscribe(socket)

    expect(socket.join).toHaveBeenCalledExactlyOnceWith([
      'projectstats;garden-foo',
      'projectstats;garden-bar',
    ])
    expect(socket.data.projectStatsSubscribed).toBe(true)
  })

  it('keeps a zero-access subscription active without delivery rooms', async () => {
    projectstats.resolveProjectStatScope.mockResolvedValue(createProjectStatScope())
    const socket = createSocket(user)

    await subscribe(socket)

    expect(socket.data.projectStatsSubscribed).toBe(true)
    expect(socket.join).not.toHaveBeenCalled()
  })

  it('leaves every ProjectStats room and clears the subscription marker', async () => {
    const socket = createSocket(user)
    socket.rooms = new Set([
      socket.id,
      'projectstats:all',
      'projectstats;garden-foo',
      'shoots:admin',
    ])
    socket.data.projectStatsSubscribed = true

    await unsubscribe(socket)

    expect(socket.leave.mock.calls).toEqual([
      ['projectstats:all'],
      ['projectstats;garden-foo'],
    ])
    expect(socket.data).not.toHaveProperty('projectStatsSubscribed')
    expect(socket.rooms).toContain('shoots:admin')
  })

  it('synchronizes unique UIDs from room scope without authorization or state changes', () => {
    const socket = createSocket(user)
    socket.data.projectStatsSubscribed = true
    socket.rooms.add('projectstats;garden-foo')
    const stat = {
      kind: 'ProjectStat',
      metadata: { name: 'foo', uid: 'foo-uid' },
    }
    projectstats.getByUids.mockReturnValue([stat, undefined])

    expect(synchronize(socket, ['foo-uid', 'foo-uid', 'secret-uid'])).toEqual([
      stat,
      notFound('secret-uid'),
    ])
    expect(projectstats.getByUids).toHaveBeenCalledExactlyOnceWith(
      ['foo-uid', 'secret-uid'],
      {
        canListAllProjectStats: false,
        projectStatNamespaces: new Set(['garden-foo']),
      },
    )
    expect(projectstats.resolveProjectStatScope).not.toHaveBeenCalled()
    expect(authorization.canListProjects).not.toHaveBeenCalled()
    expect(authorization.canListShoots).not.toHaveBeenCalled()
    expect(authorization.canListResourceQuotas).not.toHaveBeenCalled()
    expect(socket.join).not.toHaveBeenCalled()
    expect(socket.leave).not.toHaveBeenCalled()
    expect(socket.data.projectStatsSubscribed).toBe(true)
  })

  it('denies synchronization without an active subscription', () => {
    const socket = createSocket(user)

    expect(synchronize(socket, ['secret-uid', 'secret-uid'])).toEqual([
      notFound('secret-uid'),
    ])
    expect(projectstats.getByUids).not.toHaveBeenCalled()
  })

  it('fails closed when subscription authorization cannot be established', async () => {
    const socket = createSocket(user)
    socket.data.projectStatsSubscribed = true
    socket.rooms.add('projectstats;garden-foo')
    projectstats.resolveProjectStatScope.mockRejectedValue(new Error('authorization unavailable'))

    await expect(subscribe(socket)).rejects.toThrow('authorization unavailable')

    expect(socket.data).not.toHaveProperty('projectStatsSubscribed')
    expect(socket.rooms).not.toContain('projectstats;garden-foo')
  })

  it('serializes an in-flight subscribe before unsubscribe', async () => {
    const projectStatScope = createDeferred()
    projectstats.resolveProjectStatScope.mockReturnValue(projectStatScope.promise)
    const socket = createSocket(user)

    const subscribePromise = subscribe(socket)
    await vi.waitFor(() => expect(projectstats.resolveProjectStatScope).toHaveBeenCalledExactlyOnceWith(user))
    const unsubscribePromise = unsubscribe(socket)
    let unsubscribeAcknowledged = false
    unsubscribePromise.then(() => {
      unsubscribeAcknowledged = true
    })
    await Promise.resolve()
    expect(unsubscribeAcknowledged).toBe(false)

    projectStatScope.resolve(createProjectStatScope({
      projectStatNamespaces: new Set(['garden-foo']),
    }))
    await subscribePromise
    await unsubscribePromise

    expect(unsubscribeAcknowledged).toBe(true)
    expect(socket.data).not.toHaveProperty('projectStatsSubscribed')
    expect(Array.from(socket.rooms).filter(room => room.startsWith('projectstats'))).toEqual([])
  })

  it('runs a queued subscription after the previous transition fails', async () => {
    projectstats.resolveProjectStatScope
      .mockRejectedValueOnce(new Error('authorization unavailable'))
      .mockResolvedValueOnce(createProjectStatScope({ canListAllProjectStats: true }))
    const socket = createSocket(user)

    const failing = subscribe(socket)
    const succeeding = subscribe(socket)

    await expect(failing).rejects.toThrow('authorization unavailable')
    await expect(succeeding).resolves.toBeUndefined()
    expect(socket.data.projectStatsSubscribed).toBe(true)
    expect(socket.rooms).toContain('projectstats:all')
  })

  it('re-subscribes with a freshly established room scope', async () => {
    const socket = createSocket(user)
    projectstats.resolveProjectStatScope
      .mockResolvedValueOnce(createProjectStatScope({
        projectStatNamespaces: new Set(['garden-foo']),
      }))
      .mockResolvedValueOnce(createProjectStatScope())

    await subscribe(socket)
    await subscribe(socket)

    expect(projectstats.resolveProjectStatScope).toHaveBeenCalledTimes(2)
    expect(socket.data.projectStatsSubscribed).toBe(true)
    expect(Array.from(socket.rooms).filter(room => room.startsWith('projectstats'))).toEqual([])
  })
})

function createProjectStatScope (overrides = {}) {
  return {
    canListAllProjectStats: false,
    projectStatNamespaces: new Set(),
    ...overrides,
  }
}

function createSocket (user) {
  const socket = {
    id: 'socket-id',
    data: { user },
    rooms: new Set(['socket-id']),
  }
  socket.join = vi.fn(rooms => {
    for (const room of Array.isArray(rooms) ? rooms : [rooms]) {
      socket.rooms.add(room)
    }
  })
  socket.leave = vi.fn(room => socket.rooms.delete(room))
  return socket
}

function createDeferred () {
  let resolveDeferred
  const promise = new Promise(resolve => {
    resolveDeferred = resolve
  })
  return { promise, resolve: resolveDeferred }
}

function notFound (uid) {
  return {
    kind: 'Status',
    apiVersion: 'v1',
    status: 'Failure',
    message: `ProjectStat with uid ${uid} does not exist`,
    reason: 'NotFound',
    details: {
      uid,
      group: 'dashboard.gardener.cloud',
      kind: 'ProjectStat',
    },
    code: 404,
  }
}
