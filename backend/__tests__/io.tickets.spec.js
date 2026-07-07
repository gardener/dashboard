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
import { subscribe, unsubscribe } from '../lib/io/tickets.js'

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
    expect(socket.join).toHaveBeenCalledWith('issues;foo')
    expect(socket.join).toHaveBeenCalledWith('issues;bar')
    expect(socket.join).toHaveBeenCalledWith('issues;GroupMember1')
    expect(socket.join).not.toHaveBeenCalledWith('issues;pending')
  })

  it('should join only member project rooms when user cannot list projects', async () => {
    vi.spyOn(authorization, 'canListProjects').mockResolvedValue(false)
    const socket = createSocket(user)
    await subscribe(socket, { namespace: '_all' })
    expect(socket.join).toHaveBeenCalledWith('issues;foo')
    expect(socket.join).toHaveBeenCalledWith('issues;bar')
    expect(socket.join).not.toHaveBeenCalledWith('issues;GroupMember1')
  })

  it('should join specific project room when user is a member', async () => {
    vi.spyOn(authorization, 'canListProjects').mockResolvedValue(false)
    const socket = createSocket(user)
    await subscribe(socket, { namespace: 'garden-foo' })
    expect(socket.join).toHaveBeenCalledOnce()
    expect(socket.join).toHaveBeenCalledWith('issues;foo')
  })

  it('should throw when user is not a member of the requested namespace', async () => {
    vi.spyOn(authorization, 'canListProjects').mockResolvedValue(false)
    const socket = createSocket(user)
    await expect(subscribe(socket, { namespace: 'garden-GroupMember1' })).rejects.toMatchObject({
      statusCode: 403,
      message: 'Insufficient authorization for ticket subscription',
    })
    expect(socket.join).not.toHaveBeenCalled()
  })

  it('should leave only issues rooms on unsubscribe', async () => {
    const socket = createSocket(user)
    socket.rooms = new Set(['issues;foo', 'issues;bar', 'shoots;garden-foo'])
    await unsubscribe(socket)
    expect(socket.leave).toHaveBeenCalledWith('issues;foo')
    expect(socket.leave).toHaveBeenCalledWith('issues;bar')
    expect(socket.leave).not.toHaveBeenCalledWith('shoots;garden-foo')
  })
})
