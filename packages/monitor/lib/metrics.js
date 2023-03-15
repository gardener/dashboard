//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const promClient = require('prom-client')

const connectionsCount = new promClient.Gauge({
  name: 'tcp_connections_count',
  labelNames: ['type'],
  help: 'dashboard currently open connections'
})
const connectionsTotal = new promClient.Counter({
  name: 'tcp_connections_total',
  labelNames: ['type'],
  help: 'dashboard total opened connections'
})
const responseTime = new promClient.Histogram({
  name: 'http_response_duration_seconds',
  help: 'Time to first byte for requests served in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.2, 0.3, 0.5, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0, 15.0]
})

module.exports = {
  connectionsCount,
  connectionsTotal,
  responseTime
}
