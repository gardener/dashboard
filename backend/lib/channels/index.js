//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { createChannel } = require('better-sse')

module.exports = {
  shoots: createChannel(),
  unhealthyShoots: createChannel(),
  tickets: createChannel()
}
