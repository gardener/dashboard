//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
const WebSocket = require('ws')
const { http, ws } = require('./symbols')
const { beforeConnect } = require('./debug')
const { patchHttpErrorMessage } = require('./util')
const Agent = require('agentkeepalive')

class HttpClient {
  constructor ({ url, agent, ...options } = {}) {
    const prefixUrl = this.constructor[http.prefixUrl](url)
    agent = agent || this.constructor.createAgent(prefixUrl)
    this[http.client] = got.extend({ prefixUrl, agent, ...options })
  }

  async [http.request] (url, { searchParams, ...options } = {}) {
    if (searchParams && searchParams.toString()) {
      options.searchParams = searchParams
    }
    try {
      return await this[http.client](url, options)
    } catch (err) {
      throw patchHttpErrorMessage(err)
    }
  }

  [ws.connect] (url, { agent, searchParams } = {}) {
    const {
      agent: defaultAgent,
      prefixUrl,
      ca,
      key,
      cert,
      servername,
      rejectUnauthorized,
      headers
    } = this[http.client].defaults.options
    agent = agent || defaultAgent
    url = new URL(url, ensureTrailingSlashExists(prefixUrl))
    if (searchParams) {
      url.search = searchParams.toString()
    }
    const origin = url.origin
    const options = {
      agent,
      origin,
      servername,
      headers,
      key,
      cert,
      ca,
      rejectUnauthorized
    }
    beforeConnect(url, options)
    return this.constructor.createWebSocket(url, options)
  }

  static [http.prefixUrl] (url) {
    return url
  }

  static createWebSocket (url, options) {
    return new WebSocket(url, options)
  }

  static createAgent (url, options) {
    return /^https:/i.test(url)
      ? new Agent.HttpsAgent(options)
      : new Agent(options)
  }
}

function ensureTrailingSlashExists (url) {
  return url.endsWith('/') ? url : url + '/'
}

module.exports = HttpClient
