//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const createError = require('http-errors')

const request = jest.requireActual('@gardener-dashboard/request')

const clientMap = new Map()

function __setMockClients (clients) {
  clientMap.clear()
  for (const [url, client] of Object.entries(clients)) {
    const origin = new URL(url).origin
    clientMap.set(origin, client)
  }
}

module.exports = {
  __setMockClients,
  ...request,
  extend: jest.fn(options => {
    const origin = new URL(options.prefixUrl).origin
    if (clientMap.has(origin)) {
      return clientMap.get(origin)
    }
    return {
      request () {
        return Promise.reject(createError(503, 'Service Unavailable'))
      }
    }
  })
}
