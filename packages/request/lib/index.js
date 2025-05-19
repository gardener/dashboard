//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
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
