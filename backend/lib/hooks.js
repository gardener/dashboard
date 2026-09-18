//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import kubeClientModule from '@gardener-dashboard/kube-client'
import monitorModule from '@gardener-dashboard/monitor'
import cache from './cache/index.js'
import config from './config/index.js'
import * as watches from './watches/index.js'
import io from './io/index.js'
const { createDashboardClient, abortWatcher } = kubeClientModule
const { monitorHttpServer, monitorSocketIO } = monitorModule

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
    // build derived indexes
    cache.indexProjectsByNamespace(informers.projects)
    cache.indexShootsBySeedName(informers.shoots)
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
      const informer = informers[key] // eslint-disable-line security/detect-object-injection
      if (informer) {
        if (key === 'leases') {
          watch(this.io, informer, { signal: this.ac.signal })
        } else {
          watch(this.io, informer)
        }
      }
    }

    monitorHttpServer(server)
    monitorSocketIO(this.io)

    return Promise.all(untilHasSyncedList)
  }

  static createInformers (client) {
    const resourceKey = (group, resource) => `${group ?? ''}/${resource}`
    const resources = config.kubeClient?.reflector?.resources ?? []
    const reflectorOptionsByResource = new Map(
      resources.map(({ apiGroup, resource, ...options }) => [resourceKey(apiGroup, resource), options]),
    )
    const reflectorOptionsFor = observable => {
      const { group, names: { plural } } = observable.constructor
      return reflectorOptionsByResource.get(resourceKey(group, plural))
    }
    const gardenerResources = client['core.gardener.cloud']
    const seedManagementResources = client['seedmanagement.gardener.cloud']
    const coreResources = client.core
    const informers = {
      // core.gardener
      cloudprofiles: gardenerResources.cloudprofiles.informer(undefined, reflectorOptionsFor(gardenerResources.cloudprofiles)),
      controllerregistrations: gardenerResources.controllerregistrations.informer(undefined, reflectorOptionsFor(gardenerResources.controllerregistrations)),
      projects: gardenerResources.projects.informer(undefined, reflectorOptionsFor(gardenerResources.projects)),
      quotas: gardenerResources.quotas.informerAllNamespaces(undefined, reflectorOptionsFor(gardenerResources.quotas)),
      seeds: gardenerResources.seeds.informer(undefined, reflectorOptionsFor(gardenerResources.seeds)),
      shoots: gardenerResources.shoots.informerAllNamespaces(undefined, reflectorOptionsFor(gardenerResources.shoots)),
      // seedmanagement.gardener
      managedseeds: seedManagementResources.managedseeds.informer('garden', undefined, reflectorOptionsFor(seedManagementResources.managedseeds)),
      // core
      resourcequotas: coreResources.resourcequotas.informerAllNamespaces(undefined, reflectorOptionsFor(coreResources.resourcequotas)),
    }

    if (config.gitHub?.webhookSecret) {
      const informerOpts = { fieldSelector: 'metadata.name=gardener-dashboard-github-webhook' }
      const namespace = process.env.POD_NAMESPACE || 'garden'
      const leases = client['coordination.k8s.io'].leases
      informers.leases = leases.informer(namespace, informerOpts, reflectorOptionsFor(leases))
    }

    return informers
  }
}

export default () => {
  const client = createDashboardClient({
    id: 'watch',
  })
  return new LifecycleHooks(client)
}
export { LifecycleHooks }
