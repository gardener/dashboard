//
// SPDX-FileCopyrightText: Contributors to the Gardener project
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

  it('should look up only the possible seedstats rooms', () => {
    const rooms = new Map([
      ['socket-id', new Set()],
      ['shoots;garden', new Set()],
      ['seedstats;uf=0', new Set()],
      ['seedstats;seed=seed-1;uf=7', new Set()],
      ['seedstats;seed=other-seed;uf=3', new Set()],
    ])
    const has = vi.spyOn(rooms, 'has')
    const nsp = {
      adapter: {
        rooms,
      },
    }

    expect(getJoinedRooms(nsp, { seedName: 'seed-1' })).toEqual([
      { room: 'seedstats;uf=0', unhealthyFilterMask: 0 },
      { room: 'seedstats;seed=seed-1;uf=7', unhealthyFilterMask: 7 },
    ])
    expect(has).toHaveBeenCalledTimes(16)
    expect(has).not.toHaveBeenCalledWith('socket-id')
    expect(has).not.toHaveBeenCalledWith('shoots;garden')
    expect(has).not.toHaveBeenCalledWith('seedstats;seed=other-seed;uf=3')
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
