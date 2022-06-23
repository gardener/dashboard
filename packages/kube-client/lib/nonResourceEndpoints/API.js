//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const HttpClient = require('../HttpClient')
const { http } = require('../symbols')

class API extends HttpClient {
  get () {
    return this[http.request]('api', { method: 'get' })
  }
}

module.exports = API
