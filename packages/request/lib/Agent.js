//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const http2 = require('http2')
const { pick, omit } = require('lodash')
const { globalLogger: logger } = require('@gardener-dashboard/logger')
const SessionId = require('./SessionId')
const SessionPool = require('./SessionPool')

const {
  HTTP2_HEADER_AUTHORITY,
  HTTP2_HEADER_SCHEME,
  HTTP2_HEADER_HOST
} = http2.constants

class Agent {
  constructor (options = {}) {
    this.defaults = {
      options: {
        peerMaxConcurrentStreams: 100,
        keepAliveTimeout: 60000,
        connectTimeout: 15000,
        pingInterval: 0,
        ...options
      }
    }
    this.sessionPools = new Map()
  }

  destroy () {
    for (const sessionPool of this.sessionPools.values()) {
      sessionPool.destroy()
    }
  }

  request (headers, options = {}) {
    const keys = ['endStream', 'exclusive', 'parent', 'weight', 'waitForTrailers', 'signal']
    const {
      [HTTP2_HEADER_SCHEME]: scheme = 'https',
      [HTTP2_HEADER_AUTHORITY]: authority,
      [HTTP2_HEADER_HOST]: host
    } = headers

    const url = new URL(`${scheme}://${authority || host}`)
    const sid = this.createSessionId(url, omit(options, keys))
    const sessionPool = this.getSessionPool(sid)
    return sessionPool.request(headers, pick(options, keys))
  }

  createSessionId (authority, { settings, ...options } = {}) {
    return new SessionId(authority, {
      settings: {
        enablePush: false,
        ...settings
      },
      ...this.defaults.options,
      ...options
    })
  }

  getSessionPool (sid) {
    const key = sid.toString()
    let sessionPool = this.sessionPools.get(key)
    if (!sessionPool) {
      sessionPool = new SessionPool(sid)
      this.sessionPools.set(key, sessionPool)
      logger.debug('Agent - map size is %d (pool %s added)', this.sessionPools.size, sid.origin)
    }
    return sessionPool
  }
}

Object.defineProperty(Agent, 'globalAgent', { value: new Agent() })

module.exports = Agent
