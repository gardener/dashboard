//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import Client from './Client.js'
import Agent from './Agent.js'
import * as errors from './errors.js'

const { extend } = Client
const { globalAgent } = Agent

export default {
  Agent,
  globalAgent,
  extend,
  Client,
  ...errors,
}
