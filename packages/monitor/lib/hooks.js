//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const metrics = require('./metrics')

class LifecycleHooks {
  async beforeListen (server) {
    metrics.start()
  }

  async cleanup () {
    metrics.stop()
  }
}

module.exports = new LifecycleHooks()
