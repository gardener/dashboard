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

const { format: fmt } = require('util')
const delay = require('delay')
const WebSocket = require('ws')
const pEvent = require('p-event')
const moment = require('moment')
const logger = require('../../logger')
const ListPager = require('./ListPager')
const {
  isExpiredError,
  isConnectionRefused,
  isTooLargeResourceVersionError,
  getCurrentResourceVersion,
  StatusError
} = require('../ApiErrors')

function randomize (duration) {
  return Math.round(duration * (Math.random() + 1.0))
}

function getTypeName (apiVersion, kind) {
  return `${apiVersion}, Kind=${kind}`
}

class BackoffManager {
  constructor ({ min = 800, max = 15 * 1000, resetDuration = 60 * 1000, factor = 1.5, jitter = 0.1 } = {}) {
    this.min = min
    this.max = max
    this.factor = factor
    this.jitter = jitter > 0 && jitter <= 1 ? jitter : 0
    this.resetDuration = resetDuration
    this.attempt = 0
    this.timeoutId = undefined
  }

  duration () {
    this.clearTimeout()
    this.timeoutId = setTimeout(() => this.reset(), this.resetDuration)
    const attempt = this.attempt
    this.attempt += 1
    if (attempt > Math.floor(Math.log(this.max / this.min) / Math.log(this.factor))) {
      return this.max
    }
    let duration = this.min * Math.pow(this.factor, attempt)
    if (this.jitter) {
      duration = Math.floor((1 + this.jitter * (2 * Math.random() - 1)) * duration)
    }
    return Math.min(Math.floor(duration), this.max)
  }

  reset () {
    this.attempt = 0
  }

  clearTimeout () {
    clearTimeout(this.timeoutId)
  }
}

class Reflector {
  constructor (listWatcher, store) {
    this.listWatcher = listWatcher
    this.store = store
    this.period = moment.duration(1, 'seconds')
    this.gracePeriod = moment.duration(3, 'seconds')
    this.connectTimeout = moment.duration(5, 'seconds')
    this.heartbeatInterval = moment.duration(30, 'seconds')
    this.heartbeatIntervalId = undefined
    this.minWatchTimeout = moment.duration(50, 'minutes')
    this.isLastSyncResourceVersionExpired = false
    this.lastSyncResourceVersion = ''
    this.paginatedResult = false
    this.socket = undefined
    this.stopRequested = false
    this.backoffManager = new BackoffManager()
  }

  get apiVersion () {
    const { group, version } = this.listWatcher
    return group ? `${group}/${version}` : version
  }

  get kind () {
    const { names = {} } = this.listWatcher
    return names.kind
  }

  get expectedTypeName () {
    return getTypeName(this.apiVersion, this.kind)
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

  async closeOrTerminateSocket () {
    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
      logger.debug('Socket of %s has already been closed', this.expectedTypeName)
      return
    }
    const timeout = this.gracePeriod.asMilliseconds()
    try {
      logger.debug('Closing socket of %s with timeout %d', this.expectedTypeName, timeout)
      this.socket.close(4006, 'Gracefully closing websocket')
      logger.debug('Closing socket of %s has been triggered', this.expectedTypeName)
      await pEvent(this.socket, 'close', { timeout })
      logger.debug('Closed socket of %s', this.expectedTypeName)
    } catch (err) {
      logger.debug('Terminating socket of %s', this.expectedTypeName)
      this.socket.terminate()
      logger.debug('Terminated socket of %s', this.expectedTypeName)
    }
  }

  stop () {
    this.stopRequested = true
    const agent = this.listWatcher.agent
    if (agent && typeof agent.destroy === 'function') {
      agent.destroy()
    }
    this.backoffManager.clearTimeout()
    return this.closeOrTerminateSocket()
  }

  async run () {
    logger.info('Starting reflector %s', this.expectedTypeName)
    try {
      while (!this.stopRequested) {
        try {
          await this.listAndWatch()
        } catch (err) {
          logger.error('Failed to list and watch %s: %s', this.expectedTypeName, err)
        }
        if (this.stopRequested) {
          break
        }
        logger.info('Restarting reflector %s', this.expectedTypeName)
        await delay(this.backoffManager.duration())
      }
    } finally {
      logger.info('Stopped reflector %s', this.expectedTypeName)
    }
  }

  async listAndWatch () {
    const pager = ListPager.create(this.listWatcher)
    const options = {
      resourceVersion: this.relistResourceVersion
    }

    if (!this.paginatedResult && options.resourceVersion !== '' && options.resourceVersion !== '0') {
      pager.pageSize = 0
    }

    this.store.setRefreshing()

    let list
    try {
      logger.info('Calling list %s with resourceVersion %s', this.expectedTypeName, options.resourceVersion)
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
          logger.info('Falling back to full list %s', this.expectedTypeName)
          list = await pager.list({
            resourceVersion: this.relistResourceVersion
          })
        } catch (err) {
          logger.error('Failed to call full list %s: %s', this.expectedTypeName, err.message)
          return
        }
      }
      if (isTooLargeResourceVersionError(err)) {
        this.lastSyncResourceVersion = getCurrentResourceVersion(err)
      }
      logger.error('Failed to call paginated list %s: %s', this.expectedTypeName, err.message)
      return
    }

    const {
      resourceVersion,
      paginated: paginatedResult
    } = list.metadata

    const lines = Array.isArray(list.items) ? list.items.length : 0
    logger.info('List of %s successfully returned %d items (paginated=%s)', this.expectedTypeName, lines, paginatedResult)

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
    while (!this.stopRequested) {
      try {
        const options = {
          allowWatchBookmarks: true,
          timeoutSeconds: randomize(this.minWatchTimeout.asSeconds()),
          resourceVersion: this.lastSyncResourceVersion
        }
        try {
          this.socket = this.listWatcher.watch(options)
          await pEvent(this.socket, 'open', { timeout: this.connectTimeout.asMilliseconds() })
        } catch (err) {
          if (isExpiredError(err)) {
            // Don't set LastSyncResourceVersionExpired - LIST call with ResourceVersion=RV already
            // has a semantic that it returns data at least as fresh as provided RV.
            // So first try to LIST with setting RV to resource version of last observed object.
            logger.info('Watch of %s not opened with: %s', this.expectedTypeName, err.message)
          } else {
            logger.error('Watch of %s failed with: %s', this.expectedTypeName, err)
          }
          // If this is "connection refused" error, it means that most likely apiserver is not responsive.
          // It doesn't make sense to re-list all objects because most likely we will be able to restart
          // watch where we ended.
          if (isConnectionRefused(err)) {
            await delay(randomize(this.period.asMilliseconds()))
            continue
          }
          return
        }
        if (this.stopRequested) {
          return
        }
        // run websocket heartbeat
        (async () => {
          try {
            await this.heartbeat(this.socket)
          } catch (err) { /* ignore error */ }
        })()
        // handle websocket messages
        try {
          await this.watchHandler(this.socket)
        } catch (err) {
          if (isExpiredError(err)) {
            // Don't set LastSyncResourceVersionExpired - LIST call with ResourceVersion=RV already
            // has a semantic that it returns data at least as fresh as provided RV.
            // So first try to LIST with setting RV to resource version of last observed object.
            logger.info('Watch of %s closed with: %s', this.expectedTypeName, err.message)
          } else {
            logger.warn('Watch of %s ended with: %s', this.expectedTypeName, err)
          }
          return
        }
      } finally {
        logger.info('Trying to gracefully close socket of %s', this.expectedTypeName)
        await this.closeOrTerminateSocket()
        logger.info('Closed or terminated socket of %s', this.expectedTypeName)
      }
    }
  }

  async heartbeat (socket) {
    function ping () {
      if (socket.isAlive === false) {
        socket.terminate()
      } else {
        socket.isAlive = false
        socket.ping()
      }
    }

    const heartbeatIntervalId = setInterval(ping, this.heartbeatInterval.asMilliseconds())
    try {
      const asyncIterator = pEvent.iterator(socket, 'pong', {
        resolutionEvents: ['close']
      })
      // eslint-disable-next-line no-unused-vars
      for await (const data of asyncIterator) {
        socket.isAlive = true
      }
    } finally {
      clearInterval(heartbeatIntervalId)
    }
  }

  async watchHandler (socket) {
    const begin = moment()
    let count = 0
    const asyncIterator = pEvent.iterator(socket, 'message', {
      resolutionEvents: ['close']
    })
    for await (const data of asyncIterator) {
      count++
      let event
      try {
        event = JSON.parse(data)
      } catch (err) {
        logger.error('Unable to parse event for watch %', this.expectedTypeName)
        continue
      }
      const { type, object } = event
      if (type === 'ERROR') {
        throw new StatusError(object)
      }
      const { apiVersion, kind, metadata: { resourceVersion } = {} } = object
      if (apiVersion !== this.apiVersion || kind !== this.kind) {
        const typeName = getTypeName(apiVersion, kind)
        logger.error('Expected %s, but watch event object had %s', this.expectedTypeName, typeName)
        continue
      }
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
          logger.error('Unable to understand event %s for watch %s', type, this.expectedTypeName)
      }
      if (resourceVersion) {
        this.lastSyncResourceVersion = resourceVersion
      } else {
        logger.error('Received event object without resource version for watch %s', this.expectedTypeName)
      }
    }
    const end = moment()
    const watchDuration = moment.duration(end.diff(begin))
    if (watchDuration.asMilliseconds() < 1000 && count === 0) {
      throw new Error(fmt('Very short watch %s - watch lasted less than a second and no items received', this.expectedTypeName))
    }
    logger.info('Watch %s closed - total %d items received within %s', this.expectedTypeName, count, watchDuration.humanize())
  }

  static create (listWatcher, store) {
    return new this(listWatcher, store)
  }
}

module.exports = Reflector
