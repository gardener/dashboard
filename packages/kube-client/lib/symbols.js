//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

module.exports = {
  http: {
    prefixUrl: Symbol('http.prefixUrl'),
    client: Symbol('http.client'),
    agent: Symbol('http.agent'),
    request: Symbol('http.request')
  },
  ws: {
    connect: Symbol('ws.connect')
  }
}
