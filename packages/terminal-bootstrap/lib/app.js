//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const EventEmitter = require('events')
const pTimeout = require('p-timeout')

class App extends EventEmitter {
  constructor (informers, { timeout = 30_000 } = {}) {
    super()
    this.ac = new AbortController()
    this.informers = informers
    this.timeout = timeout
  }

  run () {
    const untilHasSyncedList = []
    for (const informer of Object.values(this.informers)) {
      informer.run(this.ac.signal)
      untilHasSyncedList.push(informer.store.untilHasSynced)
    }
    const fulfilled = () => this.emit('ready')
    const rejected = err => {
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
