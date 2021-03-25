//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { dashboardClient } = require('@gardener-dashboard/kube-client')
const cache = require('../lib/cache')

jest.mock('../lib/io')
jest.mock('../lib/watches')

const io = require('../lib/io')
const watches = require('../lib/watches')

const createHooks = require('../lib/hooks')

describe('hooks', () => {
  describe('LifecycleHooks', () => {
    const { LifecycleHooks } = createHooks
    let hooks

    beforeEach(() => {
      hooks = createHooks()
      hooks.ac.abort = jest.fn()
    })

    it('should create the default instance', function () {
      expect(hooks.client).toBe(dashboardClient)
      expect(hooks.io).toBeUndefined()
    })

    it('#createInformers', async function () {
      for (const key of LifecycleHooks.resources) {
        const observable = dashboardClient['core.gardener.cloud'][key]
        const informer = {
          names: {
            plural: key
          }
        }
        if (observable.constructor.scope === 'Namespaced') {
          informer.mockFn = observable.informerAllNamespaces = jest.fn(() => informer)
        } else {
          informer.mockFn = observable.informer = jest.fn(() => informer)
        }
      }
      const informers = LifecycleHooks.createInformers(dashboardClient)
      for (const key of LifecycleHooks.resources) {
        const { mockFn, names } = informers[key]
        expect(names.plural).toBe(key)
        expect(mockFn).toBeCalledTimes(1)
      }
    })

    it('#cleanup', async function () {
      // initial state
      expect(hooks.io).toBeUndefined()
      await hooks.cleanup()
      expect(hooks.ac.abort).toBeCalledTimes(1)
      hooks.ac.abort.mockClear()
      // listening state
      hooks.io = {
        close: jest.fn(callback => setImmediate(callback))
      }
      await hooks.cleanup()
      expect(hooks.ac.abort).toBeCalledTimes(1)
      expect(hooks.io.close).toBeCalledTimes(1)
      expect(hooks.io.close.mock.calls[0]).toEqual([expect.any(Function)])
    })

    describe('#beforeListen', () => {
      const server = {}
      const ticketCache = {}
      const ioInstance = {}
      let informers
      let mockCreateInformers

      beforeEach(() => {
        informers = {
          foo: {
            run: jest.fn(),
            store: {
              untilHasSynced: Promise.resolve('foo')
            }
          },
          bar: {
            run: jest.fn(),
            store: {
              untilHasSynced: Promise.resolve('bar')
            }
          }
        }
        hooks.constructor.createInformers = mockCreateInformers = jest.fn(() => informers)
        cache.initialize = jest.fn()
        cache.getTicketCache = jest.fn(() => ticketCache)
        io.mockReturnValue(ioInstance)
      })

      it('should create and run informers, create io instance and initialize cache and watches', async function () {
        await expect(hooks.beforeListen(server)).resolves.toEqual(['foo', 'bar'])

        expect(mockCreateInformers).toBeCalledTimes(1)
        expect(mockCreateInformers.mock.calls[0]).toHaveLength(1)
        expect(mockCreateInformers.mock.calls[0][0]).toBe(hooks.client)

        for (const informer of Object.values(informers)) {
          expect(informer.run).toBeCalledTimes(1)
          expect(informer.run.mock.calls[0]).toHaveLength(1)
          expect(informer.run.mock.calls[0][0]).toBe(hooks.ac.signal)
        }

        expect(cache.initialize).toBeCalledTimes(1)
        expect(cache.initialize.mock.calls[0]).toHaveLength(1)
        expect(cache.initialize.mock.calls[0][0]).toBe(informers)

        expect(io).toBeCalledTimes(1)
        expect(io.mock.calls[0]).toEqual([server, cache])

        expect(cache.getTicketCache).toBeCalledTimes(1)

        for (const [key, watch] of Object.entries(watches)) {
          expect(watch).toBeCalledTimes(1)
          expect(watch.mock.calls[0]).toHaveLength(2)
          expect(watch.mock.calls[0][0]).toBe(ioInstance)
          if (key === 'tickets') {
            expect(watch.mock.calls[0][1]).toBe(ticketCache)
          } else {
            expect(watch.mock.calls[0][1]).toBe(informers[key])
          }
        }
      })
    })
  })
})
