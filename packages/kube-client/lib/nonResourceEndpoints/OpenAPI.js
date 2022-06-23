//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const HttpClient = require('../HttpClient')
const { http } = require('../symbols')

class OpenAPI extends HttpClient {
  get () {
    return this[http.request]('openapi/v2', { method: 'get' })
  }
}

module.exports = OpenAPI
