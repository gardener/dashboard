//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const HttpClient = require('../HttpClient')
const { http } = require('../symbols')

class OpenAPI extends HttpClient {
  getGardenerV1Beta1 () {
    return this[http.request]('openapi/v3/apis/core.gardener.cloud/v1beta1', { method: 'get' })
  }
}

module.exports = OpenAPI
