//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
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
