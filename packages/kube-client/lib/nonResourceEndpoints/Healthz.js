//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
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
