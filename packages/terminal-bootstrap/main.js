//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { dashboardClient, createDashboardClient } = require('@gardener-dashboard/kube-client')
const createApp = require('./lib/app')
const cache = require('./lib/cache')
const { Bootstrapper } = require('./lib/terminal/bootstrap')

async function main () {
  const { createLightship } = await import('lightship')
  const lightship = await createLightship({
    detectKubernetes: false
  })
  const client = createDashboardClient({
    id: 'watch',
    pingInterval: 30000,
    maxOutstandingPings: 2
  })
  const bootstrapper = new Bootstrapper(dashboardClient)
  const app = createApp(client, cache, bootstrapper)
  lightship.registerShutdownHandler(() => app.shutdown())
  app
    .once('ready', () => lightship.signalReady())
    .once('error', () => lightship.shutdown())
    .run()
}

module.exports = main

if (require.main === module) {
  main()
}
