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

const { URLSearchParams } = require('url')
const { join } = require('path')
const { EventEmitter } = require('events')
const WebSocket = require('ws')
const inject = require('reconnect-core')

const BaseResource = require('./BaseResource')
const { http, ws } = require('./symbols')

const { setPatchType, wrapWebSocket } = require('../util')

class Resource extends BaseResource {
  constructor (options = {}) {
    super({ ...options, responseType: 'json' })
  }

  [http.prefixUrl] (url) {
    let prefixUrl = super[http.prefixUrl](url)
    const { group, version } = this.constructor
    if (group === 'core') {
      prefixUrl += '/api/' + version
    } else {
      prefixUrl += '/apis/' + group + '/' + version
    }
    return prefixUrl
  }

  [http.pathname] ({ namespace, allNamespaces, name }) {
    let pathname = ''
    if (this.constructor.scope === 'Namespaced') {
      if (allNamespaces) {
        if (name) {
          throw new TypeError('A namespaced resource cannot be addressed by name across all namespaces')
        }
      } else if (!namespace) {
        throw new TypeError('Either \'namespace\' or \'allNamespaces\' must be specified for a namespaced resource')
      } else {
        pathname += 'namespaces/' + encodeURIComponent(namespace) + '/'
      }
    }
    pathname += this.constructor.names.plural
    if (name) {
      pathname += '/'
      pathname += Array.isArray(name) ? name.map(encodeURIComponent).join('/') : encodeURIComponent(name)
    }
    return pathname
  }

  [http.patch] ({ type = 'merge', ...options } = {}) {
    return super[http.patch](setPatchType(options, type))
  }

  [ws.connect] ({ namespace, name, query, headers, origin, ...options } = {}) {
    const {
      prefixUrl,
      ca,
      key,
      cert,
      servername,
      rejectUnauthorized,
      headers: defaultHeaders
    } = this[http.request].defaults.options
    const url = new URL(prefixUrl)
    origin = origin || url.origin
    url.protocol = url.protocol.replace(/^http/, 'ws')
    url.pathname = join(url.pathname, this[http.pathname]({ namespace }))
    const searchParams = new URLSearchParams(query)
    searchParams.set('watch', true)
    if (name) {
      let fieldSelector = `metadata.name=${name}`
      if (searchParams.has('fieldSelector')) {
        fieldSelector += ',' + searchParams.get('fieldSelector')
      }
      searchParams.set('fieldSelector', fieldSelector)
    }
    url.search = searchParams.toString()
    headers = { ...defaultHeaders, ...headers }
    const websocketOptions = {
      origin,
      servername,
      headers,
      key,
      cert,
      ca,
      rejectUnauthorized,
      ...options
    }
    return new WebSocket(url, websocketOptions)
  }

  watch (options = {}) {
    const {
      initialDelay,
      maxDelay,
      strategy,
      failAfter,
      randomisationFactor,
      immediate,
      ...connectOptions
    } = options

    const reconnectDefaults = {
      initialDelay: 5e2,
      maxDelay: 15e3,
      strategy: 'fibonacci',
      failAfter: Infinity,
      randomisationFactor: 0,
      immediate: false
    }

    const reconnectOptions = {
      ...reconnectDefaults,
      initialDelay,
      maxDelay,
      strategy,
      failAfter,
      randomisationFactor,
      immediate
    }

    const createConnection = options => {
      const connection = new EventEmitter()
      connection.resourceName = this.type
      try {
        wrapWebSocket(connection, this[ws.connect](options))
      } catch (err) {
        return null
      }
      return connection
    }

    const onConnect = connection => {
      connection.on('event', event => reconnector.emit('event', event))
    }

    const reconnector = inject(createConnection)(reconnectOptions, onConnect)
    reconnector.resourceName = this.type
    reconnector.connect(connectOptions)
    return reconnector
  }
}

module.exports = Resource
