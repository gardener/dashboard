//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { matchers } = require('@gardener-dashboard/test-utils')
const clients = require('./clients')
const config = require('./config')
const seeds = require('./seeds')
const shoots = require('./shoots')
const helper = require('./helper')
const constants = require('./constants')

const fixtures = {
  matchers,
  clients,
  config,
  seeds,
  shoots,
  helper,
  constants
}
module.exports = fixtures
