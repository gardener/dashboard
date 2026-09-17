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
  beforeEach,
} from 'vitest'
import { createDashboardClient } from '@gardener-dashboard/kube-client'

import cache from '../lib/cache/index.js'
import config from '../lib/config/index.js'

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
      delete config.kubeClient
      createDashboardClient.mockClear()
      hooks = createHooks()
      dashboardClient = createDashboardClient.mock.results[0].value
      hooks.ac.abort = vi.fn()
    })

    it('should create the default instance', function () {
      expect(hooks.client).toBe(dashboardClient)
      expect(hooks.io).toBeUndefined()
    })

    describe('#createInformers', function () {
      const leaseQuery = { fieldSelector: 'metadata.name=gardener-dashboard-github-webhook' }
      const resources = [
        { clientGroup: 'core.gardener.cloud', name: 'cloudprofiles', method: 'informer', args: [undefined, undefined] },
        { clientGroup: 'core.gardener.cloud', name: 'controllerregistrations', method: 'informer', args: [undefined, undefined] },
        { clientGroup: 'core.gardener.cloud', name: 'projects', method: 'informer', args: [undefined, undefined] },
        { clientGroup: 'core.gardener.cloud', name: 'quotas', method: 'informerAllNamespaces', args: [undefined, undefined] },
        { clientGroup: 'core.gardener.cloud', name: 'seeds', method: 'informer', args: [undefined, undefined] },
        { clientGroup: 'core.gardener.cloud', name: 'shoots', method: 'informerAllNamespaces', args: [undefined, undefined] },
        { clientGroup: 'seedmanagement.gardener.cloud', name: 'managedseeds', method: 'informer', args: ['garden', undefined, undefined] },
        { clientGroup: 'core', name: 'resourcequotas', method: 'informerAllNamespaces', args: [undefined, undefined] },
        { clientGroup: 'coordination.k8s.io', name: 'leases', method: 'informer', args: () => [process.env.POD_NAMESPACE, leaseQuery, undefined] },
      ]
      const reflectorOptions = {
        strategy: 'mostRecentPaginated',
        pageSize: 500,
      }

      function mockInformerFactories () {
        const factories = {}
        for (const { clientGroup, name, method } of resources) {
          const informer = {
            names: { plural: name },
          }
          const factory = vi.fn(() => informer)
          dashboardClient[clientGroup][name][method] = factory
          factories[name] = factory
        }
        return factories
      }

      function expectInformerArgs (factories, overrides = {}) {
        for (const { name, args } of resources) {
          expect(factories[name].mock.calls).toEqual([overrides[name] ?? (typeof args === 'function' ? args() : args)])
        }
      }

      it('creates all informers without reflector configuration', function () {
        const factories = mockInformerFactories()

        const informers = LifecycleHooks.createInformers(dashboardClient)

        expect(Object.keys(informers)).toEqual(resources.map(({ name }) => name))
        expectInformerArgs(factories)
      })

      it('passes reflector options only to the configured Shoot informer', function () {
        expect.hasAssertions()
        config.kubeClient = {
          reflector: {
            resources: [{
              apiGroup: 'core.gardener.cloud',
              resource: 'shoots',
              ...reflectorOptions,
            }],
          },
        }
        const factories = mockInformerFactories()

        LifecycleHooks.createInformers(dashboardClient)

        expectInformerArgs(factories, {
          shoots: [undefined, reflectorOptions],
        })
      })

      it('passes reflector options to another existing namespaced resource', function () {
        expect.hasAssertions()
        config.kubeClient = {
          reflector: {
            resources: [{
              apiGroup: 'seedmanagement.gardener.cloud',
              resource: 'managedseeds',
              ...reflectorOptions,
            }],
          },
        }
        const factories = mockInformerFactories()

        LifecycleHooks.createInformers(dashboardClient)

        expectInformerArgs(factories, {
          managedseeds: ['garden', undefined, reflectorOptions],
        })
      })

      it('matches a core resource when apiGroup is omitted', function () {
        expect.hasAssertions()
        config.kubeClient = {
          reflector: {
            resources: [{
              resource: 'resourcequotas',
              ...reflectorOptions,
            }],
          },
        }
        const factories = mockInformerFactories()

        LifecycleHooks.createInformers(dashboardClient)

        expectInformerArgs(factories, {
          resourcequotas: [undefined, reflectorOptions],
        })
      })

      it('keeps the Lease field selector when passing reflector options', function () {
        expect.hasAssertions()
        config.kubeClient = {
          reflector: {
            resources: [{
              apiGroup: 'coordination.k8s.io',
              resource: 'leases',
              ...reflectorOptions,
            }],
          },
        }
        const factories = mockInformerFactories()

        LifecycleHooks.createInformers(dashboardClient)

        expectInformerArgs(factories, {
          leases: [process.env.POD_NAMESPACE, leaseQuery, reflectorOptions],
        })
      })
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
              on: vi.fn(),
              run: vi.fn(),
              store: {
                untilHasSynced: Promise.resolve(key),
              },
            },
          })
        }, {})
        hooks.constructor.createInformers = mockCreateInformers = vi.fn(() => informers)
        cache.initialize = vi.fn()
        cache.indexProjectsByNamespace = vi.fn()
        cache.indexShootsBySeedName = vi.fn()
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

        expect(cache.indexProjectsByNamespace).toHaveBeenCalledTimes(1)
        expect(cache.indexProjectsByNamespace.mock.calls[0]).toEqual([informers.projects])

        expect(cache.indexShootsBySeedName).toHaveBeenCalledTimes(1)
        expect(cache.indexShootsBySeedName.mock.calls[0]).toEqual([informers.shoots])

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
