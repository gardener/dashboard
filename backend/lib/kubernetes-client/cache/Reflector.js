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

const delay = require('delay')
const pEvent = require('p-event')
const moment = require('moment')
const { includes } = require('lodash')
const logger = require('../../logger')
const { getNameFromCallsite } = require('../../utils')
const ListPager = require('./ListPager')
const { isExpiredError, StatusError } = require('../ApiErrors')

const RETRY_ERROR_CODES = [
  'ETIMEDOUT',
  'ECONNRESET',
  'EADDRINUSE',
  'ECONNREFUSED',
  'ENOTFOUND',
  'ENETUNREACH'
]

function parseMessage (data) {
  try {
    return JSON.parse(data)
  } catch (err) {
    logger.error('Failed to parse message data', err)
  }
}

function randomize (duration) {
  return Math.round(duration * (Math.random() + 1.0))
}

class Reflector {
  constructor (listWatcher, store) {
    this.listWatcher = listWatcher
    this.store = store
    this.period = moment.duration(1, 'seconds')
    this.connectTimeout = moment.duration(5, 'seconds')
    this.heartbeatInterval = moment.duration(30, 'seconds')
    this.minWatchTimeout = moment.duration(50, 'minutes')
    this.name = getNameFromCallsite(this.constructor)
    this.isLastSyncResourceVersionExpired = false
    this.lastSyncResourceVersion = ''
    this.paginatedResult = false
    this.socket = undefined
    this.heartbeatIntervalId = undefined
    this.stopped = false
  }

  get expectedTypeName () {
    const { group, version, names: { kind } } = this.listWatcher
    return `${group}/${version}, Kind=${kind}`
  }

  get relistResourceVersion () {
    if (this.isLastSyncResourceVersionExpired) {
      // Since this reflector makes paginated list requests, and all paginated list requests skip the watch cache
      // if the lastSyncResourceVersion is expired, we set ResourceVersion="" and list again to re-establish reflector
      // to the latest available ResourceVersion, using a consistent read from etcd.
      return ''
    }
    if (this.lastSyncResourceVersion === '') {
      // For performance reasons, initial list performed by reflector uses "0" as resource version to allow it to
      // be served from the watch cache if it is enabled.
      return '0'
    }
    return this.lastSyncResourceVersion
  }

  stop () {
    this.stopped = true
    this.terminate()
  }

  async run () {
    logger.info('Starting reflector %s from %s', this.expectedTypeName, this.name)
    do {
      try {
        await this.listAndWatch()
      } catch (err) {
        logger.error('%s: Failed to list and watch %s: %s', this.name, this.expectedTypeName, err)
      }
      if (this.stopped) {
        return
      }
      logger.info('Restarting reflector %s from %s', this.expectedTypeName, this.name)
      await delay(randomize(this.period.asMilliseconds()))
    } while (true)
  }

  async listAndWatch () {
    const pager = new ListPager(this.listWatcher)
    const defaultPageSize = pager.pageSize
    const options = {
      resourceVersion: this.relistResourceVersion
    }

    if (this.paginatedResult) {
      pager.pageSize = defaultPageSize
    } else if (options.resourceVersion !== '' && options.resourceVersion !== '0') {
      pager.pageSize = 0
    }

    this.store.synchronizing()

    let list
    try {
      list = await pager.list(options)
    } catch (err) {
      if (isExpiredError(err)) {
        this.isLastSyncResourceVersionExpired = true
        // Retry immediately if the resource version used to list is expired.
        // The pager already falls back to full list if paginated list calls fail due to an "Expired" error on
        // continuation pages, but the pager might not be enabled, or the full list might fail because the
        // resource version it is listing at is expired, so we need to fallback to resourceVersion="" in all
        // to recover and ensure the reflector makes forward progress.
        try {
          list = await pager.list({
            resourceVersion: this.relistResourceVersion
          })
        } catch (err) {
          logger.error('%s: Failed to call full list %s: %s', this.name, this.expectedTypeName, err)
          return
        }
      }
      logger.error('%s: Failed to call paginated list %s: %s', this.name, this.expectedTypeName, err)
      return
    }

    const {
      resourceVersion,
      paginated: paginatedResult
    } = list.metadata

    // We check if the list was paginated and if so set the paginatedResult based on that.
    // However, we want to do that only for the initial list (which is the only case
    // when we set ResourceVersion="0"). The reasoning behind it is that later, in some
    // situations we may force listing directly from etcd (by setting ResourceVersion="")
    // which will return paginated result, even if watch cache is enabled. However, in
    // that case, we still want to prefer sending requests to watch cache if possible.
    //
    // Paginated result returned for request with ResourceVersion="0" mean that watch
    // cache is disabled and there are a lot of objects of a given type. In such case,
    // there is no need to prefer listing from watch cache.
    if (options.resourceVersion === '0' && paginatedResult) {
      this.paginatedResult = true
    }

    this.isLastSyncResourceVersionExpired = false
    this.store.replace(list.items)
    this.lastSyncResourceVersion = resourceVersion

    do {
      const options = {
        allowWatchBookmarks: true,
        timeoutSeconds: randomize(this.minWatchTimeout.asSeconds()),
        resourceVersion
      }
      try {
        try {
          this.socket = this.listWatcher.watch(options)
          await pEvent(this.socket, 'open', {
            timeout: this.connectTimeout.asMilliseconds(),
            rejectionEvents: ['error', 'unexpected-response']
          })
        } catch (err) {
          if (isExpiredError(err)) {
            // Don't set LastSyncResourceVersionExpired - LIST call with ResourceVersion=RV already
            // has a semantic that it returns data at least as fresh as provided RV.
            // So first try to LIST with setting RV to resource version of last observed object.
            logger.info('%s: watch of %s not opened with: %s', this.name, this.expectedTypeName, err.message)
          } else {
            logger.error('%s: watch of %s failed with: %s', this.name, this.expectedTypeName, err)
          }
          if (includes(RETRY_ERROR_CODES, err.code)) {
            if (this.stopped) {
              return
            }
            await delay(randomize(this.period.asMilliseconds()))
            continue
          }
          return
        }
        this.startHeartbeat(this.socket)
        try {
          await this.watchHandler(this.socket)
        } catch (err) {
          if (isExpiredError(err)) {
            // Don't set LastSyncResourceVersionExpired - LIST call with ResourceVersion=RV already
            // has a semantic that it returns data at least as fresh as provided RV.
            // So first try to LIST with setting RV to resource version of last observed object.
            logger.info('%s: watch of %s closed with: %s', this.name, this.expectedTypeName, err.message)
          } else {
            logger.warn('%s: watch of %s ended with: %s', this.name, this.expectedTypeName, err)
          }
          return
        }
      } finally {
        this.terminate()
      }
    } while (true)
  }

  startHeartbeat (socket) {
    function onPong () {
      socket.isAlive = true
    }
    function ping () {
      if (socket.isAlive === false) {
        socket.terminate()
      } else {
        socket.isAlive = false
        socket.ping()
      }
    }
    socket.on('pong', onPong)
    this.heartbeatIntervalId = setInterval(ping, this.heartbeatInterval.asMilliseconds())
  }

  terminate () {
    clearInterval(this.heartbeatIntervalId)
    if (this.socket) {
      this.socket.terminate()
    }
  }

  async watchHandler (socket) {
    const start = Date.now()
    let count = 0
    const asyncIterator = pEvent.iterator(socket, 'message', {
      resolutionEvents: ['close']
    })
    for await (const data of asyncIterator) {
      count++
      const { type, object } = parseMessage(data)
      if (type === 'ERROR') {
        throw new StatusError(object)
      }
      const { resourceVersion } = object.metadata
      switch (type) {
        case 'ADDED':
          this.store.add(object)
          break
        case 'MODIFIED':
          this.store.update(object)
          break
        case 'DELETED':
          this.store.delete(object)
          break
        case 'BOOKMARK':
          break
        default:
          logger.error(`Invalid event type "${type}"`)
      }
      this.lastSyncResourceVersion = resourceVersion
    }
    const watchDuration = Date.now() - start
    if (watchDuration < 1000 && count === 0) {
      logger.error('Very short watch: %s: Unexpected watch close - watch lasted less than a second and no items received', this.name)
      throw new Error('Very short watch')
    }
    logger.info('%s: Watch close - %s total %d items received', this.name, this.expectedTypeName, count)
  }

  static create (listWatcher, store) {
    return new this(listWatcher, store)
  }
}

module.exports = Reflector
