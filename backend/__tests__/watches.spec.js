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
  beforeEach,
} from 'vitest'

import EventEmitter from 'events'
import pLimit from 'p-limit'
import {
  chain,
  cloneDeep,
} from 'lodash-es'
import logger from '../lib/logger/index.js'
import config from '../lib/config/index.js'
import * as watches from '../lib/watches/index.js'
import cache from '../lib/cache/index.js'
import * as tickets from '../lib/services/tickets.js'
import SyncManager from '../lib/github/SyncManager.js'
import helper from '../lib/io/helper.js'

vi.mock('../lib/github/SyncManager.js')

const { sha256 } = helper

const flushPromises = () => new Promise(setImmediate)

const rooms = new Map()
const adapterRooms = new Map()

function joinRoom (name, members = ['socket-1']) {
  adapterRooms.set(name, new Set(members))
}

function getRoom (name) {
  if (!rooms.has(name)) {
    rooms.set(name, {
      emit: vi.fn(),
    })
  }
  return rooms.get(name)
}

const nsp = {
  adapter: {
    rooms: adapterRooms,
  },
  to: vi.fn().mockImplementation(name => {
    if (Array.isArray(name)) {
      return {
        rooms: name.map(getRoom),
        emit (...args) {
          for (const room of this.rooms) {
            room.emit(...args)
          }
        },
      }
    }
    return getRoom(name)
  }),
  emit: vi.fn(),
}

const sockets = [
  {
    id: 1,
    data: {
      user: {
        id: 'admin@example.org',
        profiles: {
          canListProjects: true,
          canListSeeds: true,
        },
      },
    },
  },
  {
    id: 2,
    data: {
      user: {
        id: 'foo@example.org',
        profiles: {
          canListProjects: false,
          canListSeeds: false,
        },
      },
    },
  },
  {
    id: 3,
    data: {
      user: {
        id: 'bar@example.org',
        profiles: {
          canListProjects: false,
          canListSeeds: true,
        },
      },
    },
  },
]

const io = {
  of: vi.fn().mockReturnValue(nsp),
  fetchSockets: vi.fn().mockResolvedValue(sockets),
}

describe('watches', function () {
  const foobar = { metadata: { namespace: 'foo', name: 'bar', uid: 4 } }
  const foobaz = { metadata: { namespace: 'foo', name: 'baz', uid: 5 } }
  const gardenManagedSeedShoot = { metadata: { namespace: 'garden', name: 'managed-seed-foo', uid: 6 } }

  let informer

  beforeEach(function () {
    informer = new EventEmitter()
    rooms.clear()
    adapterRooms.clear()
    vi.clearAllMocks()
  })

  describe('shoots', function () {
    const foobarUnhealthy = chain(foobar)
      .cloneDeep()
      .set(['metadata', 'labels', 'shoot.gardener.cloud/status'], 'unhealthy')
      .value()

    const foobazUnhealthy = chain(foobaz)
      .cloneDeep()
      .set(['metadata', 'labels', 'shoot.gardener.cloud/status'], 'unhealthy')
      .value()

    let shootsWithIssues

    beforeEach(() => {
      shootsWithIssues = new Set()
      vi.spyOn(cache, 'getManagedSeedForShootInGardenNamespace').mockReturnValue(undefined)
      vi.spyOn(cache, 'getSeed').mockImplementation(name => {
        if (name === 'infra1-seed') {
          return {
            metadata: {
              uid: 'seed-1',
            },
          }
        }
        if (name === 'infra1-seed2') {
          return {
            metadata: {
              uid: 'seed-2',
            },
          }
        }
      })
    })

    it('should watch shoots without issues', async function () {
      vi.spyOn(logger, 'error')
      watches.shoots(io, informer)

      expect(io.of).toHaveBeenCalledTimes(1)
      expect(io.of.mock.calls).toEqual([['/']])

      informer.emit('add', foobar)
      informer.emit('update', foobar)
      informer.emit('delete', foobar)

      expect(logger.error).not.toHaveBeenCalled()

      const keys = ['shoots:admin', 'shoots;foo', 'shoots;foo/bar']
      expect(nsp.to).toHaveBeenCalledTimes(3)
      expect(nsp.to.mock.calls).toEqual([[keys], [keys], [keys]])
      expect(Array.from(rooms.keys())).toEqual(keys)
      for (const key of keys) {
        const room = rooms.get(key)
        expect(room.emit).toHaveBeenCalledTimes(3)
        expect(room.emit.mock.calls).toEqual([
          [
            'shoots',
            { type: 'ADDED', uid: foobar.metadata.uid },
          ],
          [
            'shoots',
            { type: 'MODIFIED', uid: foobar.metadata.uid },
          ],
          [
            'shoots',
            { type: 'DELETED', uid: foobar.metadata.uid },
          ],
        ])
      }
    })

    it('should watch shoots with issues', async function () {
      watches.shoots(io, informer, { shootsWithIssues })

      expect(shootsWithIssues).toHaveProperty('size', 0)
      informer.emit('add', foobarUnhealthy)
      expect(shootsWithIssues).toHaveProperty('size', 1)
      informer.emit('update', foobar)
      expect(shootsWithIssues).toHaveProperty('size', 0)
      informer.emit('add', foobazUnhealthy)
      expect(shootsWithIssues).toHaveProperty('size', 1)
      informer.emit('update', foobazUnhealthy)
      expect(shootsWithIssues).toHaveProperty('size', 1)
      informer.emit('delete', foobazUnhealthy)
      expect(shootsWithIssues).toHaveProperty('size', 0)

      const fooRoom = rooms.get('shoots;foo')
      expect(fooRoom.emit).toHaveBeenCalledTimes(5)
      const fooIssuesRoom = rooms.get('shoots:unhealthy;foo')
      expect(fooIssuesRoom.emit).toHaveBeenCalledTimes(5)
      expect(fooIssuesRoom.emit.mock.calls).toEqual([
        [
          'shoots',
          { type: 'ADDED', uid: foobarUnhealthy.metadata.uid },
        ],
        [
          'shoots',
          { type: 'DELETED', uid: foobar.metadata.uid },
        ],
        [
          'shoots',
          { type: 'ADDED', uid: foobazUnhealthy.metadata.uid },
        ],
        [
          'shoots',
          { type: 'MODIFIED', uid: foobazUnhealthy.metadata.uid },
        ],
        [
          'shoots',
          { type: 'DELETED', uid: foobazUnhealthy.metadata.uid },
        ],
      ])
    })

    it('should emit managed seed shoots to a dedicated garden room', async function () {
      cache.getManagedSeedForShootInGardenNamespace.mockReturnValue({
        metadata: {
          namespace: 'garden',
          name: 'managed-seed-foo',
          uid: 7,
        },
      })

      watches.shoots(io, informer)

      informer.emit('add', gardenManagedSeedShoot)
      informer.emit('update', gardenManagedSeedShoot)
      informer.emit('delete', gardenManagedSeedShoot)

      await flushPromises()

      const room = rooms.get('managedseed-shoots;garden')
      expect(room.emit).toHaveBeenCalledTimes(3)
      expect(room.emit.mock.calls).toEqual([
        ['managedseed-shoots', { type: 'ADDED', uid: gardenManagedSeedShoot.metadata.uid }],
        ['managedseed-shoots', { type: 'MODIFIED', uid: gardenManagedSeedShoot.metadata.uid }],
        ['managedseed-shoots', { type: 'DELETED', uid: gardenManagedSeedShoot.metadata.uid }],
      ])
    })

    it('should emit deleted garden shoots even if the managed seed is already gone from cache', async function () {
      watches.shoots(io, informer)

      informer.emit('delete', gardenManagedSeedShoot)

      await flushPromises()

      expect(cache.getManagedSeedForShootInGardenNamespace).not.toHaveBeenCalled()

      const room = rooms.get('managedseed-shoots;garden')
      expect(room.emit).toHaveBeenCalledTimes(1)
      expect(room.emit.mock.calls).toEqual([
        ['managedseed-shoots', { type: 'DELETED', uid: gardenManagedSeedShoot.metadata.uid }],
      ])
    })

    it('should emit seedstats updates for joined rooms whose total or filtered counts changed', async function () {
      const oldShoot = {
        metadata: {
          namespace: 'garden-foo',
          name: 'fooShoot',
          uid: 9,
          labels: {
            'shoot.gardener.cloud/status': 'healthy',
          },
        },
        spec: {
          seedName: 'infra1-seed',
        },
      }
      const updatedShoot = cloneDeep(oldShoot)
      updatedShoot.metadata.labels['shoot.gardener.cloud/status'] = 'progressing'

      joinRoom('seedstats;uf=0')
      joinRoom('seedstats;uf=1')
      joinRoom('seedstats;seed=infra1-seed;uf=0')
      joinRoom('seedstats;seed=infra1-seed;uf=1')

      watches.shoots(io, informer)

      informer.emit('update', updatedShoot, oldShoot)

      await flushPromises()

      expect(rooms.get('seedstats;uf=0').emit).toHaveBeenCalledTimes(1)
      expect(rooms.get('seedstats;uf=0').emit.mock.calls).toEqual([
        ['seedstats', { type: 'MODIFIED', uid: 'seed-1' }],
      ])
      expect(rooms.get('seedstats;uf=1').emit).toHaveBeenCalledTimes(1)
      expect(rooms.get('seedstats;uf=1').emit.mock.calls).toEqual([
        ['seedstats', { type: 'MODIFIED', uid: 'seed-1' }],
      ])
      expect(rooms.get('seedstats;seed=infra1-seed;uf=0').emit).toHaveBeenCalledTimes(1)
      expect(rooms.get('seedstats;seed=infra1-seed;uf=0').emit.mock.calls).toEqual([
        ['seedstats', { type: 'MODIFIED', uid: 'seed-1' }],
      ])
      expect(rooms.get('seedstats;seed=infra1-seed;uf=1').emit).toHaveBeenCalledTimes(1)
      expect(rooms.get('seedstats;seed=infra1-seed;uf=1').emit.mock.calls).toEqual([
        ['seedstats', { type: 'MODIFIED', uid: 'seed-1' }],
      ])
    })

    it('should emit seedstats for ADDED shoot', async function () {
      const newShoot = {
        metadata: {
          namespace: 'garden-foo',
          name: 'fooShoot',
          uid: 9,
          labels: { 'shoot.gardener.cloud/status': 'healthy' },
        },
        spec: { seedName: 'infra1-seed' },
      }

      joinRoom('seedstats;uf=0')
      joinRoom('seedstats;seed=infra1-seed;uf=0')

      watches.shoots(io, informer)

      informer.emit('add', newShoot)

      await flushPromises()

      expect(rooms.get('seedstats;uf=0').emit.mock.calls).toEqual([
        ['seedstats', { type: 'MODIFIED', uid: 'seed-1' }],
      ])
      expect(rooms.get('seedstats;seed=infra1-seed;uf=0').emit.mock.calls).toEqual([
        ['seedstats', { type: 'MODIFIED', uid: 'seed-1' }],
      ])
    })

    it('should emit seedstats for DELETED shoot', async function () {
      const shoot = {
        metadata: {
          namespace: 'garden-foo',
          name: 'fooShoot',
          uid: 9,
          labels: { 'shoot.gardener.cloud/status': 'healthy' },
        },
        spec: { seedName: 'infra1-seed' },
      }

      joinRoom('seedstats;uf=0')
      joinRoom('seedstats;seed=infra1-seed;uf=0')

      watches.shoots(io, informer)

      informer.emit('delete', shoot)

      await flushPromises()

      expect(rooms.get('seedstats;uf=0').emit.mock.calls).toEqual([
        ['seedstats', { type: 'MODIFIED', uid: 'seed-1' }],
      ])
      expect(rooms.get('seedstats;seed=infra1-seed;uf=0').emit.mock.calls).toEqual([
        ['seedstats', { type: 'MODIFIED', uid: 'seed-1' }],
      ])
    })

    it('should not emit seedstats when shoot MODIFIED but health state unchanged', async function () {
      const oldShoot = {
        metadata: {
          namespace: 'garden-foo',
          name: 'fooShoot',
          uid: 9,
          labels: { 'shoot.gardener.cloud/status': 'healthy' },
        },
        spec: { seedName: 'infra1-seed' },
      }
      // Same health state, different field that doesn't affect seedstats
      const updatedShoot = cloneDeep(oldShoot)
      updatedShoot.metadata.resourceVersion = '999'

      joinRoom('seedstats;uf=0')
      joinRoom('seedstats;seed=infra1-seed;uf=0')

      watches.shoots(io, informer)

      informer.emit('update', updatedShoot, oldShoot)

      await flushPromises()

      expect(rooms.get('seedstats;uf=0')).toBeUndefined()
      expect(rooms.get('seedstats;seed=infra1-seed;uf=0')).toBeUndefined()
    })

    it('should not emit seedstats when seed is not found in cache', async function () {
      const shoot = {
        metadata: {
          namespace: 'garden-foo',
          name: 'fooShoot',
          uid: 9,
          labels: { 'shoot.gardener.cloud/status': 'healthy' },
        },
        spec: { seedName: 'unknown-seed' },
      }

      joinRoom('seedstats;uf=0')

      watches.shoots(io, informer)

      informer.emit('add', shoot)

      await flushPromises()

      expect(rooms.get('seedstats;uf=0')).toBeUndefined()
    })

    it('should emit seedstats updates for list and single-seed rooms when a shoot changes seeds', async function () {
      const oldShoot = {
        metadata: {
          namespace: 'garden-foo',
          name: 'fooShoot',
          uid: 9,
          labels: {
            'shoot.gardener.cloud/status': 'healthy',
          },
        },
        spec: {
          seedName: 'infra1-seed',
        },
      }
      const updatedShoot = cloneDeep(oldShoot)
      updatedShoot.spec.seedName = 'infra1-seed2'
      updatedShoot.metadata.labels['shoot.gardener.cloud/status'] = 'unhealthy'

      joinRoom('seedstats;uf=0')
      joinRoom('seedstats;seed=infra1-seed;uf=0')
      joinRoom('seedstats;seed=infra1-seed2;uf=0')

      watches.shoots(io, informer)

      informer.emit('update', updatedShoot, oldShoot)

      await flushPromises()

      expect(rooms.get('seedstats;uf=0').emit.mock.calls).toEqual([
        ['seedstats', { type: 'MODIFIED', uid: 'seed-1' }],
        ['seedstats', { type: 'MODIFIED', uid: 'seed-2' }],
      ])
      expect(rooms.get('seedstats;seed=infra1-seed;uf=0').emit.mock.calls).toEqual([
        ['seedstats', { type: 'MODIFIED', uid: 'seed-1' }],
      ])
      expect(rooms.get('seedstats;seed=infra1-seed2;uf=0').emit.mock.calls).toEqual([
        ['seedstats', { type: 'MODIFIED', uid: 'seed-2' }],
      ])
    })
  })

  describe('projects', function () {
    it('should watch projects', async function () {
      vi.spyOn(logger, 'error')
      watches.projects(io, informer)

      expect(io.of).toHaveBeenCalledTimes(1)
      expect(io.of.mock.calls).toEqual([['/']])

      const uid = 4
      const bar = {
        metadata: {
          name: 'bar',
          uid,
        },
        spec: {
          members: [{
            kind: 'User',
            name: 'foo@example.org',
          }],
        },
      }

      informer.emit('add', bar)
      const modifiedBar = cloneDeep(bar)
      modifiedBar.spec.members = []
      informer.emit('update', modifiedBar, bar)
      informer.emit('delete', modifiedBar)

      await flushPromises()

      expect(logger.error).not.toHaveBeenCalled()

      const ids = [
        'admin@example.org',
        'foo@example.org',
      ].map(sha256)
      expect(Array.from(rooms.keys())).toEqual(ids)
      expect(nsp.to).toHaveBeenCalledTimes(5)

      const adminRoom = rooms.get(ids[0])
      expect(adminRoom.emit).toHaveBeenCalledTimes(3)
      expect(adminRoom.emit.mock.calls).toEqual([
        ['projects', { type: 'ADDED', uid }],
        ['projects', { type: 'MODIFIED', uid }],
        ['projects', { type: 'DELETED', uid }],
      ])

      const fooRoom = rooms.get(ids[1])
      expect(fooRoom.emit).toHaveBeenCalledTimes(2)
      expect(fooRoom.emit.mock.calls).toEqual([
        ['projects', { type: 'ADDED', uid }],
        ['projects', { type: 'DELETED', uid }],
      ])
    })
  })

  describe('seeds', function () {
    it('should watch seeds only for joined seedstats rooms', async function () {
      watches.seeds(io, informer)

      const uid = 7
      const seed = {
        metadata: {
          name: 'seed-foo',
          uid,
        },
      }

      joinRoom('seedstats;uf=0')
      joinRoom('seedstats;seed=seed-foo;uf=7')
      joinRoom('seedstats;seed=other-seed;uf=7')

      informer.emit('add', seed)
      informer.emit('update', seed)
      informer.emit('delete', seed)

      await flushPromises()

      const ids = ['seeds', 'seedstats;uf=0', 'seedstats;seed=seed-foo;uf=7']

      expect(Array.from(rooms.keys())).toEqual(ids)
      expect(nsp.to).toHaveBeenCalledTimes(9)
      expect(nsp.to.mock.calls).toEqual([
        ['seeds'],
        ['seedstats;uf=0'],
        ['seedstats;seed=seed-foo;uf=7'],
        ['seeds'],
        ['seedstats;uf=0'],
        ['seedstats;seed=seed-foo;uf=7'],
        ['seeds'],
        ['seedstats;uf=0'],
        ['seedstats;seed=seed-foo;uf=7'],
      ])

      const seedsRoom = rooms.get('seeds')
      expect(seedsRoom.emit).toHaveBeenCalledTimes(3)
      expect(seedsRoom.emit.mock.calls).toEqual([
        ['seeds', { type: 'ADDED', uid }],
        ['seeds', { type: 'MODIFIED', uid }],
        ['seeds', { type: 'DELETED', uid }],
      ])

      const seedStatsListRoom = rooms.get('seedstats;uf=0')
      expect(seedStatsListRoom.emit).toHaveBeenCalledTimes(3)
      expect(seedStatsListRoom.emit.mock.calls).toEqual([
        ['seedstats', { type: 'ADDED', uid }],
        ['seedstats', { type: 'MODIFIED', uid }],
        ['seedstats', { type: 'DELETED', uid }],
      ])

      const seedStatsSeedRoom = rooms.get('seedstats;seed=seed-foo;uf=7')
      expect(seedStatsSeedRoom.emit).toHaveBeenCalledTimes(3)
      expect(seedStatsSeedRoom.emit.mock.calls).toEqual([
        ['seedstats', { type: 'ADDED', uid }],
        ['seedstats', { type: 'MODIFIED', uid }],
        ['seedstats', { type: 'DELETED', uid }],
      ])
    })
  })

  describe('managedseeds', function () {
    beforeEach(() => {
      vi.spyOn(cache, 'getShoot').mockReturnValue(undefined)
    })

    it('should watch managedseeds in the garden room', async function () {
      watches.managedseeds(io, informer)

      const uid = 8
      const managedSeed = {
        metadata: {
          namespace: 'garden',
          name: 'seed-foo',
          uid,
        },
      }

      informer.emit('add', managedSeed)
      informer.emit('update', managedSeed)
      informer.emit('delete', managedSeed)

      await flushPromises()

      const ids = ['managedseeds;garden']

      expect(Array.from(rooms.keys())).toEqual(ids)
      expect(nsp.to).toHaveBeenCalledTimes(3)

      const managedSeedsRoom = rooms.get(ids[0])
      expect(managedSeedsRoom.emit).toHaveBeenCalledTimes(3)
      expect(managedSeedsRoom.emit.mock.calls).toEqual([
        ['managedseeds', { type: 'ADDED', uid }],
        ['managedseeds', { type: 'MODIFIED', uid }],
        ['managedseeds', { type: 'DELETED', uid }],
      ])

      expect(cache.getShoot).not.toHaveBeenCalled()
    })

    it('should backfill managed seed shoots on managedseed add', async function () {
      cache.getShoot.mockReturnValue(gardenManagedSeedShoot)

      watches.managedseeds(io, informer)

      const uid = 8
      const managedSeed = {
        metadata: {
          namespace: 'garden',
          name: 'seed-foo',
          uid,
        },
        spec: {
          shoot: {
            name: gardenManagedSeedShoot.metadata.name,
          },
        },
      }

      informer.emit('add', managedSeed)

      await flushPromises()

      expect(cache.getShoot).toHaveBeenCalledTimes(1)
      expect(cache.getShoot).toHaveBeenCalledWith('garden', gardenManagedSeedShoot.metadata.name)

      const managedSeedsRoom = rooms.get('managedseeds;garden')
      expect(managedSeedsRoom.emit).toHaveBeenCalledTimes(1)
      expect(managedSeedsRoom.emit).toHaveBeenCalledWith('managedseeds', { type: 'ADDED', uid })

      const managedSeedShootsRoom = rooms.get('managedseed-shoots;garden')
      expect(managedSeedShootsRoom.emit).toHaveBeenCalledTimes(1)
      expect(managedSeedShootsRoom.emit).toHaveBeenCalledWith('managedseed-shoots', {
        type: 'ADDED',
        uid: gardenManagedSeedShoot.metadata.uid,
      })
    })

    it('should ignore managedseeds outside the garden namespace', async function () {
      watches.managedseeds(io, informer)

      const managedSeed = {
        metadata: {
          namespace: 'foo',
          name: 'seed-foo',
          uid: 8,
        },
      }

      informer.emit('add', managedSeed)
      informer.emit('update', managedSeed)
      informer.emit('delete', managedSeed)

      await flushPromises()

      expect(nsp.to).not.toHaveBeenCalled()
      expect(Array.from(rooms.keys())).toEqual([])
      expect(cache.getShoot).not.toHaveBeenCalled()
    })
  })

  describe('leases', function () {
    const metadata = {
      projectName: 'foo',
      name: 'bar',
    }
    const issueEvent = { object: { metadata } }
    const commentEvent = { object: { metadata } }

    const ticketCache = {
      on (eventName, handler) {
        switch (eventName) {
          case 'issue':
            handler(issueEvent)
            break
          case 'comment':
            handler(commentEvent)
            break
        }
      },
    }

    const gitHubConfig = {
      pollIntervalSeconds: 10,
      syncThrottleSeconds: 2,
    }

    let gitHubStub
    let abortController
    let signal

    beforeEach(function () {
      vi.clearAllMocks()

      gitHubStub = vi.fn()
      Object.defineProperty(config, 'gitHub', { get: gitHubStub })
      gitHubStub.mockReturnValue(gitHubConfig)

      abortController = new AbortController()
      signal = abortController.signal

      vi.spyOn(cache, 'getTicketCache').mockReturnValue(ticketCache)
      vi.spyOn(cache, 'getShoot').mockReturnValue({
        spec: {
          seedName: 'infra1-seed',
        },
      })
      vi.spyOn(cache, 'getSeed').mockReturnValue({
        metadata: {
          uid: 'seed-1',
        },
      })
    })

    it('should log a warning if gitHub config is missing and not continue', async function () {
      vi.spyOn(ticketCache, 'on')
      vi.spyOn(logger, 'warn')
      gitHubStub.mockReturnValue(false)

      await watches.leases(io, informer, { signal: abortController.signal })

      expect(logger.warn).toHaveBeenCalledTimes(1)
      expect(ticketCache.on).toHaveBeenCalledTimes(0)
    })

    it('should add event listeners and create SyncManager', async function () {
      vi.spyOn(ticketCache, 'on')
      vi.spyOn(informer, 'on')

      watches.leases(io, informer, { signal })

      expect(io.of).toHaveBeenCalledTimes(1)
      expect(io.of).toHaveBeenCalledWith('/')

      expect(ticketCache.on).toHaveBeenCalledTimes(2)
      expect(ticketCache.on).toHaveBeenCalledWith('issue', expect.any(Function))
      expect(ticketCache.on).toHaveBeenCalledWith('comment', expect.any(Function))

      expect(SyncManager).toHaveBeenCalledTimes(1)
      expect(SyncManager).toHaveBeenCalledWith(expect.any(Function), {
        interval: gitHubConfig.pollIntervalSeconds * 1000,
        throttle: gitHubConfig.syncThrottleSeconds * 1000,
        signal,
      })
      const syncManagerInstance = SyncManager.mock.instances[0]
      expect(syncManagerInstance.sync).toHaveBeenCalledTimes(1)

      expect(informer.on).toHaveBeenCalledTimes(1)
      expect(informer.on).toHaveBeenCalledWith('update', expect.any(Function))
    })

    it('should create SyncManager with defaults', async () => {
      gitHubStub.mockReturnValue({})

      watches.leases(io, informer, { signal })

      expect(SyncManager).toHaveBeenCalledTimes(1)
      expect(SyncManager.mock.calls[0]).toEqual([
        expect.any(Function),
        {
          interval: 0,
          throttle: 0,
          signal,
        },
      ])
    })

    it('should call loadOpenIssuesAndComments with defaulted concurrency parameter', async () => {
      vi.spyOn(tickets, 'loadOpenIssues')
      tickets.loadOpenIssues.mockResolvedValue([])

      gitHubStub.mockReturnValue({})
      watches.leases(io, informer, { signal })

      expect(SyncManager).toHaveBeenCalledTimes(1)
      const [funcWithDefaultConcurrency] = SyncManager.mock.calls[0]
      await funcWithDefaultConcurrency()
      expect(pLimit).toHaveBeenCalledWith(10)
    })

    it('should call loadOpenIssuesAndComments with configured concurrency parameter', async () => {
      vi.spyOn(tickets, 'loadOpenIssues')
      tickets.loadOpenIssues.mockResolvedValue([])

      gitHubStub.mockReturnValue({ syncConcurrency: 42 })
      watches.leases(io, informer, { signal })

      expect(SyncManager).toHaveBeenCalledTimes(1)
      const [funcWithConfiguredConcurrency] = SyncManager.mock.calls[0]
      await funcWithConfiguredConcurrency()
      expect(pLimit).toHaveBeenCalledWith(42)
    })

    it('should emit ticket cache events to socket io and seedstats only for bit-2 rooms', async () => {
      joinRoom('seedstats;uf=4')
      joinRoom('seedstats;seed=infra1-seed;uf=4')
      joinRoom('seedstats;uf=0')

      watches.leases(io, informer, { signal })

      expect(nsp.emit).toHaveBeenCalledTimes(1)
      expect(nsp.emit).toHaveBeenCalledWith('issues', issueEvent)

      const room = `shoots;${cache.getProjectNamespace(issueEvent.object.metadata.projectName)}/${issueEvent.object.metadata.name}`
      const mockRoom = rooms.get(room)
      expect(nsp.to).toHaveBeenCalledWith([room])
      expect(mockRoom.emit).toHaveBeenCalledTimes(1)
      expect(mockRoom.emit).toHaveBeenCalledWith('comments', issueEvent)

      expect(rooms.get('seedstats;uf=4').emit).toHaveBeenCalledTimes(1)
      expect(rooms.get('seedstats;uf=4').emit).toHaveBeenCalledWith('seedstats', { type: 'MODIFIED', uid: 'seed-1' })
      expect(rooms.get('seedstats;seed=infra1-seed;uf=4').emit).toHaveBeenCalledTimes(1)
      expect(rooms.get('seedstats;seed=infra1-seed;uf=4').emit).toHaveBeenCalledWith('seedstats', { type: 'MODIFIED', uid: 'seed-1' })
      expect(rooms.has('seedstats;uf=0')).toBe(false)
    })

    it('should not emit seedstats for issue events when no joined rooms have FILTER_HIDE_TICKETS bit set', async () => {
      joinRoom('seedstats;uf=0')
      joinRoom('seedstats;uf=1')
      joinRoom('seedstats;seed=infra1-seed;uf=0')

      watches.leases(io, informer, { signal })

      expect(rooms.has('seedstats;uf=0')).toBe(false)
      expect(rooms.has('seedstats;uf=1')).toBe(false)
      expect(rooms.has('seedstats;seed=infra1-seed;uf=0')).toBe(false)
    })

    it('should not emit seedstats for issue events when shoot is not found in cache', async () => {
      cache.getShoot.mockReturnValue(undefined)

      joinRoom('seedstats;uf=4')

      watches.leases(io, informer, { signal })

      expect(rooms.has('seedstats;uf=4')).toBe(false)
    })

    it('should not emit seedstats for issue events when seed is not found in cache', async () => {
      cache.getSeed.mockReturnValue(undefined)

      joinRoom('seedstats;uf=4')

      watches.leases(io, informer, { signal })

      expect(rooms.has('seedstats;uf=4')).toBe(false)
    })

    it('should not emit seedstats for issue events with missing metadata', async () => {
      const badEvent = { object: { metadata: {} } }
      const ticketCacheWithBadEvent = {
        on (eventName, handler) {
          if (eventName === 'issue') {
            handler(badEvent)
          }
        },
      }
      cache.getTicketCache.mockReturnValue(ticketCacheWithBadEvent)

      joinRoom('seedstats;uf=4')

      watches.leases(io, informer, { signal })

      expect(rooms.has('seedstats;uf=4')).toBe(false)
    })

    it('should listen to informer update events', async function () {
      vi.spyOn(informer, 'on')

      watches.leases(io, informer, { signal })

      expect(informer.on).toHaveBeenCalledTimes(1)
      expect(informer.on).toHaveBeenCalledWith('update', expect.any(Function))

      informer.emit('update', {})

      const syncManagerInstance = SyncManager.mock.instances[0]
      expect(syncManagerInstance.sync).toHaveBeenCalledTimes(2)
    })

    it('should should load issues and comments of all issues', async function () {
      const { test: { loadOpenIssuesAndComments } } = await import('../lib/watches/leases.js')

      const issues = fixtures.github.issues.list()
      const issueNumbers = issues.map(i => i.number)
      const comments = fixtures.github.comments.list()

      const t = await Promise.all(issues.map(i => tickets.fromIssue(i)))

      vi.spyOn(tickets, 'loadOpenIssues')
      vi.spyOn(tickets, 'loadIssueComments')

      tickets.loadOpenIssues.mockResolvedValue(t)

      const loadIssueCommentsMock = ({ number }) => comments.filter(comment => comment.number === number)
      tickets.loadIssueComments.mockImplementation(loadIssueCommentsMock)

      await loadOpenIssuesAndComments(10)

      expect(tickets.loadOpenIssues).toHaveBeenCalledTimes(1)
      expect(tickets.loadIssueComments).toHaveBeenCalledTimes(t.length)
      for (const number of issueNumbers) {
        expect(tickets.loadIssueComments).toHaveBeenCalledWith({ number })
      }
    })
  })
})
