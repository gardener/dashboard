//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const prometheus = require('prom-client')

const register = new prometheus.Registry()

const metrics = {
  connectionsCount: new prometheus.Gauge({
    name: 'tcp_connections_count',
    labelNames: ['type'],
    help: 'dashboard currently open connections',
    registers: [register]
  }),
  connectionsTotal: new prometheus.Counter({
    name: 'tcp_connections_total',
    labelNames: ['type'],
    help: 'dashboard total opened connections',
    registers: [register]
  }),
  responseTime: new prometheus.Histogram({
    name: 'http_response_duration_seconds',
    help: 'Time to first byte for requests served in seconds',
    labelNames: ['method', 'service'],
    buckets: [
      ...prometheus.linearBuckets(0, 0.1, 5), // 0-0.5s with 100ms buckets
      ...prometheus.linearBuckets(0.5, 0.5, 5), // 0.5-3s with 500ms buckets
      ...prometheus.linearBuckets(3, 1, 12) // 3-15s with 1000ms buckets
    ],
    registers: [register]
  })
}

function start () {
  prometheus.collectDefaultMetrics({ register })
}

function getMetrics () {
  return register.metrics()
}

function stop () {
  register.clear()
}

module.exports = {
  contentType: register.contentType,
  start,
  stop,
  getMetrics,
  metrics
}
