//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import HttpClient from '../HttpClient.js'
import { http } from '../symbols.js'

class OpenAPI extends HttpClient {
  getGardenerApis () {
    return this[http.request]('openapi/v3/apis/core.gardener.cloud/v1beta1', { method: 'get' })
  }
}

export default OpenAPI
