//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import HttpClient from '../HttpClient.js'
import { http } from '../symbols.js'

class API extends HttpClient {
  get () {
    return this[http.request]('api', { method: 'get' })
  }
}

export default API
