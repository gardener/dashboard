//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const EventEmitter = require('events')
const pTimeout = require('p-timeout')
const logger = require('./logger')

class App extends EventEmitter {
  constructor (informers, { timeout = 30_000 } = {}) {
    super()
    this.ac = new AbortController()
    this.informers = informers
    this.timeout = timeout
  }

  run () {
    const untilHasSyncedList = []
    const pendingInformers = new Set()
    for (const informer of Object.values(this.informers)) {
      pendingInformers.add(informer)
      informer.run(this.ac.signal)
      const untilHasSynced = informer.store.untilHasSynced.then(() => {
        logger.debug('Initial synchronization of %s was completed successfully', informer.names.plural)
        pendingInformers.delete(informer)
      })
      untilHasSyncedList.push(untilHasSynced)
    }
    const fulfilled = () => this.emit('ready')
    const rejected = err => {
      for (const informer of pendingInformers) {
        logger.error('Initial synchronization of %s timed out', informer.names.plural)
      }
      this.shutdown()
      this.emit('error', err)
    }
    pTimeout(Promise.all(untilHasSyncedList), this.timeout).then(fulfilled, rejected)
    return this
  }

  shutdown () {
    for (const informer of Object.values(this.informers)) {
      informer.abort()
    }
  }
}

module.exports = (client, cache, bootstrapper, options) => {
  const informers = {
    shoots: client['core.gardener.cloud'].shoots.informerAllNamespaces(),
    seeds: client['core.gardener.cloud'].seeds.informer()
  }
  // initialize cache
  cache.initialize(informers)
  // register watches
  const handleEvent = event => bootstrapper.handleResourceEvent(event)
  for (const informer of Object.values(informers)) {
    informer.on('add', object => handleEvent({ type: 'ADDED', object }))
    informer.on('update', object => handleEvent({ type: 'MODIFIED', object }))
    informer.on('delete', object => handleEvent({ type: 'DELETED', object }))
  }
  return new App(informers, options)
}
