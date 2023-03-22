//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { createDashboardClient, abortWatcher } = require('@gardener-dashboard/kube-client')
const { monitorHttpServer, monitorSocketIO } = require('@gardener-dashboard/monitor')
const cache = require('./cache')
const config = require('./config')
const watches = require('./watches')
const io = require('./io')

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
      if (informers[key]) {
        if (key === 'leases') {
          watch(this.io, informers[key], { signal: this.ac.signal })
        } else {
          watch(this.io, informers[key])
        }
      }
    }

    monitorHttpServer(server)
    monitorSocketIO(this.io)

    return Promise.all(untilHasSyncedList)
  }

  static createInformers (client) {
    const informers = {
      // core.gardener
      cloudprofiles: client['core.gardener.cloud'].cloudprofiles.informer(),
      controllerregistrations: client['core.gardener.cloud'].controllerregistrations.informer(),
      projects: client['core.gardener.cloud'].projects.informer(),
      quotas: client['core.gardener.cloud'].quotas.informerAllNamespaces(),
      seeds: client['core.gardener.cloud'].seeds.informer(),
      shoots: client['core.gardener.cloud'].shoots.informerAllNamespaces(),
      // core
      resourcequotas: client.core.resourcequotas.informerAllNamespaces()
    }

    if (config.gitHub?.webhookSecret) {
      const informerOpts = { fieldSelector: 'metadata.name=gardener-dashboard-github-webhook' }
      const namespace = process.env.POD_NAMESPACE || 'garden'
      informers.leases = client['coordination.k8s.io'].leases.informer(namespace, informerOpts)
    }

    return informers
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
