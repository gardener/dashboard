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

class Client {
  constructor ({
    prefixUrl,
    cert,
    key,
    ca,
    rejectUnauthorized,
    ...options
  } = {}) {
    if (!prefixUrl) {
      throw TypeError('Parameter "prefixUrl" is required')
    }
    if (options.agent) {
      const agent = options.agent
      if (agent instanceof https.Agent) {
        options.agent = { https: agent }
      } else if (options.agent instanceof http.Agent) {
        options.agent = { http: agent }
      }
    }
    if (key || cert || ca || rejectUnauthorized === true) {
      options.https = {}
      if (key) {
        options.https.key = key
      }
      if (cert) {
        options.https.cert = cert
      }
      if (ca) {
        options.https.certificateAuthority = ca
      }
      if (rejectUnauthorized === true) {
        options.https.rejectUnauthorized = true
      }
    }
    this[request] = got.extend({ prefixUrl, ...options })
  }

  get defaults () {
    const {
      https: {
        key,
        cert,
        certificateAuthority,
        rejectUnauthorized
      } = {},
      agent: {
        http: httpAgent,
        https: httpsAgent
      } = {},
      ...options
    } = this[request].defaults.options
    if (key || cert || certificateAuthority || rejectUnauthorized === true) {
      if (key) {
        options.key = key
      }
      if (cert) {
        options.cert = cert
      }
      if (certificateAuthority) {
        options.ca = certificateAuthority
      }
      if (rejectUnauthorized === true) {
        options.rejectUnauthorized = true
      }
    }
    if (httpsAgent || httpAgent) {
      options.agent = httpsAgent || httpAgent
    }
    return { options }
  }

  request (url, options) {
    try {
      return this[request](url, options)
    } catch (err) {
      if (err instanceof got.HTTPError) {
        throw new HTTPError(err.response)
      }
      throw err
    }
  }
}

module.exports = Client
