//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { createDashboardClient } = require('@gardener-dashboard/kube-client')

const cache = require('../dist/lib/cache')

jest.mock('../dist/lib/io')
jest.mock('../dist/lib/watches')

const io = require('../dist/lib/io')
const watches = require('../dist/lib/watches')

const hookModule = require('../dist/lib/hooks')

describe('hooks', () => {
  describe('LifecycleHooks', () => {
    const { LifecycleHooks, default: createHooks } = hookModule
    let hooks
    let dashboardClient

    beforeEach(() => {
      createDashboardClient.mockClear()
      hooks = createHooks()
      dashboardClient = createDashboardClient.mock.results[0].value
      hooks.ac.abort = jest.fn()
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
          mockFn: jest.fn(() => informer),
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
        close: jest.fn(callback => setImmediate(callback)),
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
      const keys = ['leases', 'shoots', 'projects', 'seeds']
      let informers
      let mockCreateInformers

      beforeEach(() => {
        informers = keys.reduce((acc, key) => {
          return Object.assign(acc, {
            [key]: {
              run: jest.fn(),
              store: {
                untilHasSynced: Promise.resolve(key),
              },
            },
          })
        }, {})
        hooks.constructor.createInformers = mockCreateInformers = jest.fn(() => informers)
        cache.initialize = jest.fn()
        cache.getTicketCache = jest.fn(() => ticketCache)
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
        expect(io.mock.calls[0]).toEqual([server])

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
