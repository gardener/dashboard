//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { registerHandler } = require('./common')
const { bootstrapper } = require('../services/terminals')
const {
  dashboardClient // privileged client for the garden cluster
} = require('@gardener-dashboard/kube-client')

module.exports = io => {
  const emitter = dashboardClient['core.gardener.cloud'].seeds.watchList()
  registerHandler(emitter, event => bootstrapper.handleResourceEvent(event))
}
