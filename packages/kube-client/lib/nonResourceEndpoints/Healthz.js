//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import HttpClient from '../HttpClient.js'
import { http } from '../symbols.js'

class Healthz extends HttpClient {
  get () {
    return this[http.request]('healthz', { method: 'get' })
  }
}

export default Healthz
