//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
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
