//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict'

const got = require('got')
const https = require('https')
const http = require('http')

const HTTPError = require('./HTTPError')

const request = Symbol('request')

class HTTPClient {
  constructor ({ prefixUrl, ...options } = {}) {
    if (!prefixUrl) {
      throw TypeError('prefixUrl is required')
    }
    this[request] = got.extend({ prefixUrl, ...this.constructor.normalizeOptions(options) })
  }

  get defaults () {
    return {
      options: this.constructor.denormalizeOptions(this[request].defaults.options)
    }
  }

  async request (url, options) {
    try {
      return await this[request](url, this.constructor.normalizeOptions(options))
    } catch (err) {
      if (err instanceof got.HTTPError) {
        throw new HTTPError(err.response)
      }
      throw err
    }
  }

  static normalizeOptions ({ agent, key, cert, ca, rejectUnauthorized, ...options } = {}) {
    if (agent) {
      if (agent instanceof https.Agent) {
        options.agent = {
          https: agent
        }
      } else if (agent instanceof http.Agent) {
        options.agent = {
          http: agent
        }
      }
    }
    if (key || cert || ca || rejectUnauthorized === false) {
      options.https = {}
      if (key) {
        options.https.key = key
      }
      if (cert) {
        options.https.certificate = cert
      }
      if (ca) {
        options.https.certificateAuthority = ca
      }
      if (rejectUnauthorized === false) {
        options.https.rejectUnauthorized = false
      }
    }

    return options
  }

  static denormalizeOptions ({ https: httpsOptions = {}, agent: agentOptions = {}, ...options }) {
    const {
      key,
      certificate,
      certificateAuthority,
      rejectUnauthorized
    } = httpsOptions

    if (key) {
      options.key = key
    }
    if (certificate) {
      options.cert = certificate
    }
    if (certificateAuthority) {
      options.ca = certificateAuthority
    }
    if (rejectUnauthorized === false) {
      options.rejectUnauthorized = false
    }

    const {
      http: httpAgent,
      https: httpsAgent
    } = agentOptions

    if (httpsAgent) {
      options.agent = httpsAgent
    } else if (httpAgent) {
      options.agent = httpAgent
    }

    return options
  }
}

module.exports = HTTPClient
