//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { createDashboardClient, abortWatcher } = require('@gardener-dashboard/kube-client')
const { monitorHttpServer, monitorSocketIO } = require('@gardener-dashboard/monitor')
const cache = require('./cache')
const watches = require('./watches')
const io = require('./io')
const assert = require('assert').strict

class LifecycleHooks {
  constructor (client) {
    // client
    this.client = client
    // abort controller
    this.ac = new AbortController()
    // io instance
    this.io = undefined
  }

  cleanup () {
    this.ac.abort()
    abortWatcher()
    return new Promise(resolve => {
      if (this.io) {
        this.io.close(resolve)
      } else {
        resolve()
      }
    })
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
    // create io instance
    this.io = io(server, cache)
    // register watches
    for (const [key, watch] of Object.entries(watches)) {
      if (key === 'tickets') {
        watch(this.io, informers.leases, cache.getTicketCache(), this.ac.signal)
      } else {
        watch(this.io, informers[key])
      }
    }

    monitorHttpServer(server)
    monitorSocketIO(this.io)

    return Promise.all(untilHasSyncedList)
  }

  static createInformers (client) {
    const informers = {}
    for (const [apiGroup, resources] of Object.entries(this.resources)) {
      for (const resource of resources) {
        let name
        let args = []
        if (Array.isArray(resource)) {
          [name, args] = resource
        } else {
          name = resource
        }

        if (!apiGroup || !name) {
          assert.fail('Invalid resource key. Need to have format apiGroup/resourceName.')
        }

        const observable = client[apiGroup][name]
        if (observable.constructor.scope === 'Cluster') {
          informers[name] = observable.informer(...args)
        } else {
          const method = typeof args[0] === 'string'
            ? 'informer'
            : 'informerAllNamespaces'
          informers[name] = observable[method](...args)
        }
      }
    }
    return informers
  }

  static get resources () {
    return {
      'coordination.k8s.io': [
        [
          'leases',
          [
            'garden',
            { fieldSelector: 'metadata.name=gardener-dashboard-github-webhook' }
          ]
        ]
      ],
      'core.gardener.cloud': [
        'cloudprofiles',
        'quotas',
        'seeds',
        'shoots',
        'projects',
        'controllerregistrations'
      ],
      core: [
        'resourcequotas'
      ]
    }
  }
}

module.exports = () => {
  const client = createDashboardClient({
    id: 'watch',
    pingInterval: 30000,
    maxOutstandingPings: 2
  })
  return new LifecycleHooks(client)
}
module.exports.LifecycleHooks = LifecycleHooks
