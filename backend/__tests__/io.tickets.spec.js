//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterEach,
} from 'vitest'
import { seedProjectNamespaceIndex } from './helpers/cache.js'
import * as authorization from '../lib/services/authorization.js'
import {
  subscribe,
  unsubscribe,
} from '../lib/io/tickets.js'

describe('io/tickets', () => {
  beforeAll(() => {
    seedProjectNamespaceIndex()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function createSocket (user) {
    return {
      data: { user },
      join: vi.fn(),
      leave: vi.fn(),
      rooms: new Set(),
    }
  }

  // foo@example.org is a member of projects 'foo' and 'bar' in fixtures
  const user = { id: 'foo@example.org' }

  it('should join all non-pending project rooms when user can list projects', async () => {
    vi.spyOn(authorization, 'canListProjects').mockResolvedValue(true)
    const socket = createSocket(user)
    await subscribe(socket, { namespace: '_all' })
    expect(socket.join).toHaveBeenCalledWith('issues;garden-foo')
    expect(socket.join).toHaveBeenCalledWith('issues;garden-bar')
    expect(socket.join).toHaveBeenCalledWith('issues;garden-GroupMember1')
    expect(socket.join).not.toHaveBeenCalledWith('issues;garden-pending')
  })

  it('should join only member project rooms when user cannot list projects', async () => {
    vi.spyOn(authorization, 'canListProjects').mockResolvedValue(false)
    const socket = createSocket(user)
    await subscribe(socket, { namespace: '_all' })
    expect(socket.join).toHaveBeenCalledWith('issues;garden-foo')
    expect(socket.join).toHaveBeenCalledWith('issues;garden-bar')
    expect(socket.join).not.toHaveBeenCalledWith('issues;garden-GroupMember1')
  })

  it('should join specific project room when user is a member', async () => {
    vi.spyOn(authorization, 'canListProjects').mockResolvedValue(false)
    const socket = createSocket(user)
    await subscribe(socket, { namespace: 'garden-foo' })
    expect(socket.join).toHaveBeenCalledExactlyOnceWith('issues;garden-foo')
  })

  it('should throw when user is not a member of the requested namespace', async () => {
    vi.spyOn(authorization, 'canListProjects').mockResolvedValue(false)
    const socket = createSocket(user)
    await expect(subscribe(socket, { namespace: 'garden-GroupMember1' })).rejects.toMatchObject({
      statusCode: 403,
      message: 'Forbidden to subscribe to tickets in namespace garden-GroupMember1',
    })
    expect(socket.join).not.toHaveBeenCalled()
  })

  it('should throw when the requested namespace does not exist', async () => {
    vi.spyOn(authorization, 'canListProjects').mockResolvedValue(false)
    const socket = createSocket(user)
    await expect(subscribe(socket, { namespace: 'garden-nonexistent' })).rejects.toMatchObject({
      statusCode: 403,
      message: 'Forbidden to subscribe to tickets in namespace garden-nonexistent',
    })
    expect(socket.join).not.toHaveBeenCalled()
  })

  it('should join specific shoot comment room when namespace and shootName are provided', async () => {
    vi.spyOn(authorization, 'canListProjects').mockResolvedValue(false)
    const socket = createSocket(user)
    await subscribe(socket, { namespace: 'garden-foo', shootName: 'my-shoot' })
    expect(socket.join).toHaveBeenCalledExactlyOnceWith('issues;garden-foo/my-shoot')
  })

  it('should leave issues and comments rooms on unsubscribe', async () => {
    const socket = createSocket(user)
    socket.rooms = new Set(['issues;garden-foo', 'issues;garden-foo/my-shoot', 'shoots;garden-foo'])
    await unsubscribe(socket)
    expect(socket.leave).toHaveBeenCalledWith('issues;garden-foo')
    expect(socket.leave).toHaveBeenCalledWith('issues;garden-foo/my-shoot')
    expect(socket.leave).not.toHaveBeenCalledWith('shoots;garden-foo')
  })
})
