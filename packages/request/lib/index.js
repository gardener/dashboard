//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const Client = require('./Client')
const Agent = require('./Agent')
const errors = require('./errors')

const { extend } = Client
const { globalAgent } = Agent

module.exports = {
  Agent,
  globalAgent,
  extend,
  Client,
  ...errors
}
