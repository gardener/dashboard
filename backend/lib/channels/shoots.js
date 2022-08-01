//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { createChannel } = require('better-sse')

const channel = createChannel()

setInterval(() => {
  console.log('count', channel.sessionCount)
  channel.broadcast(channel.sessionCount, 'sessions')
}, 1000)

module.exports = channel
