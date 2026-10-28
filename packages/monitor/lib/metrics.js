//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import promClient from 'prom-client'

const cacheCollectors = new Map()

const connectionsCount = new promClient.Gauge({
  name: 'tcp_connections_count',
  help: 'Number of currently open TCP connections',
  labelNames: ['type'],
})
const connectionsTotal = new promClient.Counter({
  name: 'tcp_connections_total',
  help: 'Total number of opened TCP connections',
  labelNames: ['type'],
})
const informerEventsTotal = new promClient.Counter({
  name: 'kube_informer_events_total',
  help: 'Total number of events processed by Kubernetes informers',
  labelNames: ['informer', 'type'],
})
const responseTime = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [
    1e-1, 2e-1, 3e-1, 5e-1,
    1e+0, 2e+0, 3e+0, 5e+0,
    1e+1, 2e+1,
  ],
})
const cachedItemsCount = new promClient.Gauge({
  name: 'cache_items',
  help: 'Number of items in cache',
  labelNames: ['cache'],
  collect () {
    this.reset()
    for (const [cache, getCount] of cacheCollectors) {
      this.set({ cache }, getCount())
    }
  },
})

export function registerCacheCollector (cache, getCount) {
  cacheCollectors.set(cache, getCount)
}

export default {
  connectionsCount,
  connectionsTotal,
  informerEventsTotal,
  responseTime,
  cachedItemsCount,
}
