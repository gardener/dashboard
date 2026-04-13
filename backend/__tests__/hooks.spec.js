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
import { createDashboardClient } from '@gardener-dashboard/kube-client'

import cache from '../lib/cache/index.js'

vi.mock('../lib/io/index.js')
vi.mock('../lib/watches/index.js')

const { default: io } = await import('../lib/io/index.js')
const watches = await import('../lib/watches/index.js')

const { default: hookModule, LifecycleHooks } = await import('../lib/hooks.js')

describe('hooks', () => {
  describe('LifecycleHooks', () => {
    const createHooks = hookModule
    let hooks
    let dashboardClient

    beforeEach(() => {
      createDashboardClient.mockClear()
      hooks = createHooks()
      dashboardClient = createDashboardClient.mock.results[0].value
      hooks.ac.abort = vi.fn()
    })

    it('should create the default instance', function () {
      expect(hooks.client).toBe(dashboardClient)
      expect(hooks.io).toBeUndefined()
    })

    it('#createInformers', async function () {
      const resources = [
        ['core.gardener.cloud', 'cloudprofiles'],
        ['core.gardener.cloud', 'seeds'],
        ['core.gardener.cloud', 'controllerregistrations'],
        ['core.gardener.cloud', 'quotas'],
        ['core.gardener.cloud', 'shoots'],
        ['core', 'resourcequotas'],
        ['coordination.k8s.io', 'leases'],
      ]

      for (const [apiGroup, name] of resources) {
        const observable = dashboardClient[apiGroup][name]

        const informer = {
          names: {
            plural: name,
          },
          mockFn: vi.fn(() => informer),
        }

        observable.informerAllNamespaces = informer.mockFn
        observable.informer = informer.mockFn
      }
      const informers = LifecycleHooks.createInformers(dashboardClient)
      for (const [, name] of resources) {
        const { mockFn, names } = informers[name]
        expect(names.plural).toBe(name)
        expect(mockFn).toHaveBeenCalledTimes(1)
      }
    })

    it('#cleanup', async function () {
      // initial state
      expect(hooks.io).toBeUndefined()
      await hooks.cleanup()
      expect(hooks.ac.abort).toHaveBeenCalledTimes(1)
      hooks.ac.abort.mockClear()
      // listening state
      hooks.io = {
        close: vi.fn(callback => setImmediate(callback)),
      }
      await hooks.cleanup()
      expect(hooks.ac.abort).toHaveBeenCalledTimes(1)
      expect(hooks.io.close).toHaveBeenCalledTimes(1)
      expect(hooks.io.close.mock.calls[0]).toEqual([expect.any(Function)])
    })

    describe('#beforeListen', () => {
      const server = {}
      const ticketCache = {}
      const ioInstance = {}
      const keys = ['leases', 'shoots', 'projects', 'seeds', 'managedseeds']
      let informers
      let mockCreateInformers

      beforeEach(() => {
        informers = keys.reduce((acc, key) => {
          return Object.assign(acc, {
            [key]: {
              run: vi.fn(),
              store: {
                untilHasSynced: Promise.resolve(key),
              },
            },
          })
        }, {})
        hooks.constructor.createInformers = mockCreateInformers = vi.fn(() => informers)
        cache.initialize = vi.fn()
        cache.getTicketCache = vi.fn(() => ticketCache)
        io.mockReturnValue(ioInstance)
      })

      it('should create and run informers, create io instance and initialize cache and watches', async function () {
        await expect(hooks.beforeListen(server)).resolves.toEqual(keys)

        expect(mockCreateInformers).toHaveBeenCalledTimes(1)
        expect(mockCreateInformers.mock.calls[0]).toHaveLength(1)
        expect(mockCreateInformers.mock.calls[0][0]).toBe(hooks.client)

        for (const informer of Object.values(informers)) {
          expect(informer.run).toHaveBeenCalledTimes(1)
          expect(informer.run.mock.calls[0]).toHaveLength(1)
          expect(informer.run.mock.calls[0][0]).toBe(hooks.ac.signal)
        }

        expect(cache.initialize).toHaveBeenCalledTimes(1)
        expect(cache.initialize.mock.calls[0]).toHaveLength(1)
        expect(cache.initialize.mock.calls[0][0]).toBe(informers)

        expect(io).toHaveBeenCalledTimes(1)
        expect(io.mock.calls[0]).toEqual([server, expect.anything()])

        for (const [key, watch] of Object.entries(watches)) {
          expect(watch).toHaveBeenCalledTimes(1)
          expect(watch.mock.calls[0]).toHaveLength(key === 'leases' ? 3 : 2)
          expect(watch.mock.calls[0][0]).toBe(ioInstance)
          expect(watch.mock.calls[0][1]).toBe(informers[key])
        }
        expect(watches.leases.mock.calls[0][2].signal).toBeInstanceOf(AbortSignal)
      })
    })
  })
})
