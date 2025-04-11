//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { createDashboardClient, abortWatcher } = require('@gardener-dashboard/kube-client')
const { monitorHttpServer, monitorSocketIO } = require('@gardener-dashboard/monitor')
const getCache = require('./cache')
const config = require('./config')
const watches = require('./watches')
const io = require('./io')
const logger = require('./logger')

class LifecycleHooks {
  constructor (client) {
    // client
    this.client = client
    // abort controller
    this.ac = new AbortController()
    // io instance
    this.io = undefined
    // workspace watchers
    this.watchers = {}
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
    if (process.env.KCP) {
      const workspacesInformer = this.client['tenancy.kcp.io'].workspaces.informer()

      workspacesInformer.on('add', async workspace => {
        const workspacepath = `${workspace.spec.type.path}:${workspace.metadata.name}`
        logger.debug('Starting watches for workspace %s', workspacepath)
        const watcher = new ResourceWatcher(server, workspacepath, this.ac)
        await watcher.watchResourcesInWorkspace()
        this.watchers[workspace.metadata.uid] = watcher
      })

      workspacesInformer.on('delete', workspace => {
        const workspacepath = `${workspace.spec.type.path}:${workspace.metadata.name}`
        logger.debug('Stopping watches for workspace %s', workspacepath)
        const watcher = this.watchers[workspace.metadata.uid]
        if (watcher) {
          watcher.ac.abort()
          delete this.watchers[workspace.metadata.uid]
        }
      })

      // Start the informer with an abort controller if applicable
      workspacesInformer.run(new AbortController().signal)

      monitorHttpServer(server)
    } else {
      logger.debug('Starting watches in non workspace mode')
      const watcher = new ResourceWatcher(server, undefined, this.ac)
      watcher.watchResourcesInWorkspace()
    }
  }
}

class ResourceWatcher {
  constructor (server, workspace, ac) {
    // server
    this.server = server
    // workspace
    this.workspace = workspace
    // client
    this.client = createDashboardClient(
      workspace,
      {
        id: `watch-${this.workspace ?? 'default'}`,
        pingInterval: 30000,
        maxOutstandingPings: 2,
      })
    // cache
    this.cache = getCache(this.workspace)
    // io instance
    this.io = undefined
    // abort controller
    this.ac = ac
  }

  watchResourcesInWorkspace () {
    // create informers
    const informers = this.constructor.createInformers(this.client)
    // initialize cache
    this.cache.initialize(informers)
    // run informers
    const untilHasSyncedList = []
    for (const informer of Object.values(informers)) {
      informer.run(this.ac.signal)
      untilHasSyncedList.push(informer.store.untilHasSynced)
    }
    // create io instance
    this.io = io(this.server, this.workspace)
    // register watches
    for (const [key, watch] of Object.entries(watches)) {
      const informer = informers[key] // eslint-disable-line security/detect-object-injection
      if (informer) {
        if (key === 'leases') {
          // TODO What to do with the leases informer? =>root workspace? shared repo or dedicated?
          // watch(this.io, informer, { signal: this.ac.signal })
        } else {
          watch(this.io, informer)
        }
      }
    }

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
      resourcequotas: client.core.resourcequotas.informerAllNamespaces(),
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
  const rootClient = createDashboardClient(
    'root', // TODO: use root here? =>Currently we assume that root is the parent of all workspaces
    {
      id: 'watch',
      pingInterval: 30000,
      maxOutstandingPings: 2,
    })
  return new LifecycleHooks(rootClient)
}
module.exports.LifecycleHooks = LifecycleHooks
