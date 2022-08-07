//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { createDashboardClient, abortWatcher } = require('@gardener-dashboard/kube-client')
const cache = require('./cache')
const watches = require('./watches')

class LifecycleHooks {
  constructor (client) {
    // client
    this.client = client
    // abort controller
    this.ac = new AbortController()
  }

  cleanup () {
    this.ac.abort()
    abortWatcher()
  }

  beforeListen (server) {
    // create informers
    const informers = this.constructor.createInformers(this.client)
    // initialize cache
    cache.initialize(informers)
    // run informers
    const untilHasSyncedList = []
    for (const informer of Object.values(informers)) {
      informer.run(this.ac.signal)
      untilHasSyncedList.push(informer.store.untilHasSynced)
    }
    // register watches
    for (const [key, watch] of Object.entries(watches)) {
      if (key === 'tickets') {
        watch(cache.getTicketCache())
      } else {
        watch(informers[key])
      }
    }
    return Promise.all(untilHasSyncedList)
  }

  static createInformers (client) {
    const informers = {}
    for (const key of this.resources) {
      const observable = client['core.gardener.cloud'][key]
      informers[key] = observable.constructor.scope === 'Namespaced'
        ? observable.informerAllNamespaces()
        : observable.informer()
    }
    return informers
  }

  static get resources () {
    return [
      'cloudprofiles',
      'quotas',
      'seeds',
      'shoots',
      'projects',
      'controllerregistrations'
    ]
  }
}

module.exports = () => {
  const client = createDashboardClient({
    id: 'informer',
    pingInterval: 30000,
    maxOutstandingPings: 2
  })
  return new LifecycleHooks(client)
}
module.exports.LifecycleHooks = LifecycleHooks
