//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import promClient from 'prom-client'

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

export default {
  connectionsCount,
  connectionsTotal,
  responseTime,
}
