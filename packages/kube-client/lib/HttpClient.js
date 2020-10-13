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

const request = require('@gardener-dashboard/request')
const { isHttpError } = require('http-errors')
const WebSocket = require('ws')
const { beforeConnect } = require('./debug')
const { http, ws } = require('./symbols')
const Agent = require('agentkeepalive')

class HttpClient {
  constructor ({ url, ...options } = {}) {
    const prefixUrl = this.constructor[http.prefixUrl](url)
    if (!Reflect.has(options, 'agent')) {
      options.agent = this.constructor.createAgent(prefixUrl)
    }
    this[http.client] = request.extend({ prefixUrl, ...options })
  }

  get [http.agent] () {
    return this[http.client].defaults.options.agent
  }

  async [http.request] (url, { searchParams, ...options } = {}) {
    if (searchParams && searchParams.toString()) {
      options.searchParams = searchParams
    }
    try {
      return await this[http.client].request(url, options)
    } catch (err) {
      if (isHttpError(err)) {
        const { body = {} } = err
        if (body.message) {
          err.message = body.message
        }
      }
      throw err
    }
  }

  [ws.connect] (url, { searchParams, ...connectOptions } = {}) {
    const defaultOptions = this[http.client].defaults.options
    const {
      prefixUrl,
      servername,
      headers,
      ca,
      key,
      cert,
      rejectUnauthorized
    } = defaultOptions
    url = new URL(url, ensureTrailingSlashExists(prefixUrl))
    if (searchParams) {
      url.search = searchParams.toString()
    }
    const origin = url.origin
    const options = {
      origin,
      servername,
      headers,
      key,
      cert,
      ca,
      rejectUnauthorized
    }
    if (Reflect.has(connectOptions, 'agent')) {
      options.agent = connectOptions.agent
    } else if (Reflect.has(defaultOptions, 'agent')) {
      options.agent = defaultOptions.agent
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
