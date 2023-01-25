//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const EventEmitter = require('events')
const { Store } = require('@gardener-dashboard/kube-client')
const { TimeoutError } = require('p-timeout')
const createApp = require('../lib/app')

describe('app', () => {
  const shoot = {
    kind: 'Shoot',
    metadata: { uid: '1' }
  }
  const seed = {
    kind: 'Seed',
    metadata: { uid: '2' }
  }
  const createInformer = () => {
    const informer = new EventEmitter()
    informer.run = jest.fn()
    informer.abort = jest.fn()
    informer.store = new Store()
    return informer
  }

  let informers
  let client
  let cache
  let bootstrapper

  beforeEach(() => {
    informers = {
      shoots: createInformer(),
      seeds: createInformer()
    }
    client = {
      'core.gardener.cloud': {
        shoots: {
          informerAllNamespaces: jest.fn().mockReturnValue(informers.shoots)
        },
        seeds: {
          informer: jest.fn().mockReturnValue(informers.seeds)
        }
      }
    }
    cache = {
      initialize: jest.fn()
    }
    bootstrapper = {
      handleResourceEvent: jest.fn()
    }
  })

  it('should create a bootstrap application', () => {
    const app = createApp(client, cache, bootstrapper)
    expect(app).toBeDefined()
    expect(client['core.gardener.cloud'].shoots.informerAllNamespaces).toBeCalledTimes(1)
    expect(client['core.gardener.cloud'].seeds.informer).toBeCalledTimes(1)
    expect(app.informers).toEqual(informers)
    expect(app.ac).toBeInstanceOf(AbortController)
    expect(cache.initialize).toBeCalledTimes(1)
    expect(cache.initialize.mock.calls[0]).toEqual([informers])

    informers.shoots.emit('add', shoot)
    informers.shoots.emit('update', shoot)
    informers.shoots.emit('delete', shoot)
    informers.seeds.emit('add', seed)
    informers.seeds.emit('update', seed)
    informers.seeds.emit('delete', seed)
    expect(bootstrapper.handleResourceEvent).toBeCalledTimes(6)
    expect(bootstrapper.handleResourceEvent.mock.calls).toEqual([
      [{ type: 'ADDED', object: shoot }],
      [{ type: 'MODIFIED', object: shoot }],
      [{ type: 'DELETED', object: shoot }],
      [{ type: 'ADDED', object: seed }],
      [{ type: 'MODIFIED', object: seed }],
      [{ type: 'DELETED', object: seed }]
    ])
  })

  it('should run and shutdown a bootstrap application', async () => {
    const app = createApp(client, cache, bootstrapper)
    const readyPromise = new Promise(resolve => app.once('ready', resolve))
    setTimeout(() => {
      informers.shoots.store.replace([shoot])
      informers.seeds.store.replace([seed])
    }, 1)
    app.run()
    await expect(readyPromise).resolves.toBeUndefined()
    app.shutdown()
    expect(informers.shoots.abort).toBeCalledTimes(1)
    expect(informers.seeds.abort).toBeCalledTimes(1)
  })

  it('should fail to run a bootstrap application', async () => {
    const app = createApp(client, cache, bootstrapper, { timeout: 1 })
    const readyPromise = new Promise((resolve, reject) => {
      app.once('error', err => reject(err))
      app.once('ready', resolve)
    })
    app.run()
    await expect(readyPromise).rejects.toThrow(TimeoutError)
    expect(informers.shoots.abort).toBeCalledTimes(1)
    expect(informers.seeds.abort).toBeCalledTimes(1)
  })
})
