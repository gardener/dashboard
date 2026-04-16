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
  afterEach,
} from 'vitest'
import * as seedstatsService from '../lib/services/seedstats.js'
import {
  getJoinedRooms,
  subscribe,
  synchronize,
} from '../lib/io/seedstats.js'

describe('io/seedstats', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function createSocket (user) {
    return {
      data: { user },
      join: vi.fn(),
      rooms: new Set(),
    }
  }

  function notFound (uid) {
    return {
      kind: 'Status',
      apiVersion: 'v1',
      status: 'Failure',
      message: `SeedStat with uid ${uid} does not exist`,
      reason: 'NotFound',
      details: {
        uid,
        group: 'dashboard.gardener.cloud',
        kind: 'SeedStat',
      },
      code: 404,
    }
  }

  it('should throw for invalid seedstats rooms while collecting joined rooms', () => {
    let invocation = 0
    const room = {
      [Symbol.toPrimitive] () {
        invocation += 1
        return invocation === 1 ? 'seedstats;uf=0' : 'invalid-room'
      },
    }
    const nsp = {
      adapter: {
        rooms: new Map([[room, new Set()]]),
      },
    }

    expect(() => getJoinedRooms(nsp)).toThrow(new TypeError('Invalid seedstats room: invalid-room'))
  })

  it('should reject unauthorized seedstats subscriptions', async () => {
    const socket = createSocket({
      id: 'user@example.org',
      profiles: {
        canListSeeds: true,
        canListShoots: false,
      },
    })

    await expect(subscribe(socket, { unhealthyFilterMask: 0 })).rejects.toEqual(expect.objectContaining({
      statusCode: 403,
      message: 'Insufficient authorization for seedstats subscription',
    }))
    expect(socket.join).not.toHaveBeenCalled()
  })

  it('should return not found statuses for unauthorized seedstats synchronization', async () => {
    const getByUidsSpy = vi.spyOn(seedstatsService, 'getByUids')
    const socket = createSocket({
      id: 'user@example.org',
      profiles: {
        canListSeeds: false,
        canListShoots: true,
      },
    })
    const uids = ['seed-1', 'seed-2']

    await expect(synchronize(socket, uids, { unhealthyFilterMask: 0 })).resolves.toEqual([
      notFound('seed-1'),
      notFound('seed-2'),
    ])
    expect(getByUidsSpy).not.toHaveBeenCalled()
  })
})
