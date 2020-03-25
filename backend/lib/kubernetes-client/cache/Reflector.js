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
const WebSocket = require('ws')
const pEvent = require('p-event')
const moment = require('moment')
const logger = require('../../logger')
const ListPager = require('./ListPager')
const { isExpiredError, isTimeoutError, isRetryError, StatusError } = require('../ApiErrors')

function randomize (duration) {
  return Math.round(duration * (Math.random() + 1.0))
}

function getTypeName (apiVersion, kind) {
  return `${apiVersion}, Kind=${kind}`
}

async function closeOrTerminateSocket (socket, gracePeriodMilliseconds = 1000) {
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    return
  }
  try {
    socket.close(4006, 'Gracefully closing websocket')
    await pEvent(socket, 'close', { timeout: gracePeriodMilliseconds })
  } catch (err) {
    socket.terminate()
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

  stop () {
    this.stopRequested = true
    const agent = this.listWatcher.agent
    if (agent && typeof agent.destroy === 'function') {
      agent.destroy()
    }
    return closeOrTerminateSocket(this.socket, this.gracePeriod.asMilliseconds())
  }

  async run () {
    logger.info('Starting reflector %s', this.expectedTypeName)
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
      await delay(randomize(this.period.asMilliseconds()))
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
          logger.error('Failed to call full list %s: %s', this.expectedTypeName, err)
          return
        }
      }
      logger.error('Failed to call paginated list %s: %s', this.expectedTypeName, err)
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
    try {
      while (!this.stopRequested) {
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
          if (isTimeoutError(err)) {
            await closeOrTerminateSocket(this.socket, this.gracePeriod.asMilliseconds())
          }
          if (isRetryError(err)) {
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
      }
    } finally {
      await closeOrTerminateSocket(this.socket, this.gracePeriod.asMilliseconds())
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
    if (watchDuration.asSeconds() < 1000 && count === 0) {
      logger.error('Very short watch %s - watch lasted less than a second and no items received', this.expectedTypeName)
      throw new Error('Very short watch')
    }
    logger.info('Watch %s closed - total %d items received within ', this.expectedTypeName, count)
  }

  static create (listWatcher, store) {
    return new this(listWatcher, store)
  }
}

module.exports = Reflector
