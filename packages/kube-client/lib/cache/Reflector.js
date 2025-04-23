//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { format as fmt } from 'node:util'
import timers from 'timers/promises'
import { globalLogger as logger } from '@gardener-dashboard/logger'
import ListPager from './ListPager.js'
import BackoffManager from './BackoffManager.js'
import {
  isExpiredError,
  isConnectionRefused,
  isTooLargeResourceVersionError,
  isAbortError,
  StatusError,
} from '../ApiErrors.js'

function delay (milliseconds) {
  return timers.setTimeout(milliseconds)
}

function randomize (duration) {
  return Math.round(duration * (Math.random() + 1.0))
}

function getTypeName (apiVersion, kind) {
  return `${apiVersion}, Kind=${kind}`
}

class Reflector {
  constructor (listWatcher, store) {
    this.listWatcher = listWatcher
    this.store = store
    this.minWatchTimeout = 300 // 5 minutes
    this.isLastSyncResourceVersionUnavailable = false
    this.lastSyncResourceVersion = ''
    this.paginatedResult = false
    this.stopRequested = false
    this.backoffManager = new BackoffManager()
    this.initConnBackoffManager = new BackoffManager()
    this.signal = undefined
  }

  get apiVersion () {
    const { group, version } = this.listWatcher
    return group ? `${group}/${version}` : version
  }

  get names () {
    return this.listWatcher.names || {}
  }

  get kind () {
    return this.names.kind
  }

  get expectedTypeName () {
    return getTypeName(this.apiVersion, this.kind)
  }

  get relistResourceVersion () {
    if (this.isLastSyncResourceVersionUnavailable) {
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

  destroy () {
    this.backoffManager.clearTimeout()
    this.initConnBackoffManager.clearTimeout()
  }

  setAbortSignal (signal) {
    if (this.signal) {
      throw TypeError('Abort signal has already been defined')
    }
    this.signal = signal
    signal.addEventListener('abort', () => this.destroy(), { once: true })
    this.listWatcher.setAbortSignal(signal)
  }

  async run (signal) {
    assertSignal(signal)
    this.setAbortSignal(signal)
    logger.info('Starting reflector %s', this.expectedTypeName)
    while (!this.signal.aborted) {
      try {
        await this.listAndWatch()
      } catch (err) {
        if (!isAbortError(err)) {
          logger.error('Failed to list and watch %s: %s', this.expectedTypeName, err)
        }
      }
      if (this.signal.aborted) {
        break
      }
      await delay(this.backoffManager.duration() + 1000)
      logger.info('Restarting reflector %s', this.expectedTypeName)
    }
    logger.info('Stopped reflector %s', this.expectedTypeName)
  }

  syncWith (items, resourceVersion) {
    for (const item of items) {
      item.kind = this.kind
      item.apiVersion = this.apiVersion
    }
    this.store.replace(items, resourceVersion)
  }

  async listAndWatch () {
    const pager = ListPager.create(this.listWatcher)
    const options = {
      resourceVersion: this.relistResourceVersion,
    }

    if (this.paginatedResult) {
      // We got a paginated result initially. Assume this resource and server honor
      // paging requests (i.e. watch cache is probably disabled) and leave the default
      // pager size set.
    } else if (options.resourceVersion !== '' && options.resourceVersion !== '0') {
      // User didn't explicitly request pagination.
      //
      // With ResourceVersion != "", we have a possibility to list from watch cache,
      // but we do that (for ResourceVersion != "0") only if Limit is unset.
      // To avoid thundering herd on etcd (e.g. on master upgrades), we explicitly
      // switch off pagination to force listing from watch cache (if enabled).
      // With the existing semantic of RV (result is at least as fresh as provided RV),
      // this is correct and doesn't lead to going back in time.
      //
      // We also don't turn off pagination for ResourceVersion="0", since watch cache
      // is ignoring Limit in that case anyway, and if watch cache is not enabled
      // we don't introduce regression.
      pager.pageSize = 0
    }

    let list
    try {
      logger.debug('List %s with resourceVersion %s', this.expectedTypeName, options.resourceVersion)
      list = await pager.list(options)
    } catch (err) {
      if (isExpiredError(err) || isTooLargeResourceVersionError(err)) {
        this.isLastSyncResourceVersionUnavailable = true
        // Retry immediately if the resource version used to list is unavailable.
        // The pager already falls back to full list if paginated list calls fail due to an "Expired" error on
        // continuation pages, but the pager might not be enabled, the full list might fail because the
        // resource version it is listing at is expired or the cache may not yet be synced to the provided
        // resource version. So we need to fallback to resourceVersion="" in all to recover and ensure
        // the reflector makes forward progress.
        try {
          logger.debug('Falling back to full list %s', this.expectedTypeName)
          list = await pager.list({
            resourceVersion: this.relistResourceVersion,
          })
        } catch (err) {
          logger.error('Failed to call full list %s: %s', this.expectedTypeName, err.message)
          return
        }
      }
      logger.error('Failed to call paginated list %s: %s', this.expectedTypeName, err.message)
      return
    }

    const {
      resourceVersion,
      paginated: paginatedResult,
    } = list.metadata

    const lines = Array.isArray(list.items) ? list.items.length : 0
    logger.debug('List of %s successfully returned %d items (%s)', this.expectedTypeName, lines, paginatedResult ? 'paginated' : 'not paginated')

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

    this.isLastSyncResourceVersionUnavailable = false
    this.syncWith(list.items, resourceVersion)
    this.lastSyncResourceVersion = resourceVersion

    while (!this.signal.aborted) {
      const timeoutSeconds = randomize(this.minWatchTimeout)
      const gracePeriod = 5
      const options = {
        allowWatchBookmarks: true,
        timeoutSeconds,
        resourceVersion: this.lastSyncResourceVersion,
      }
      let response
      try {
        logger.debug('Watch %s with resourceVersion %s', this.expectedTypeName, options.resourceVersion)
        response = await this.listWatcher.watch(options)
      } catch (err) {
        if (isConnectionRefused(err)) {
          // If this is "connection refused" error, it means that most likely apiserver is not responsive.
          // It doesn't make sense to re-list all objects because most likely we will be able to restart
          // watch where we ended.
          // If that's the case begin exponentially backing off and resend watch request.
          logger.info('Watch of %s refused connection with: %s', this.expectedTypeName, err.message)
          await delay(this.initConnBackoffManager.duration())
          continue
        }
        throw err
      }
      try {
        await this.watchHandler(response, (timeoutSeconds + gracePeriod) * 1000)
      } catch (err) {
        if (isExpiredError(err)) {
          // Don't set LastSyncResourceVersionUnavailable - LIST call with ResourceVersion=RV already
          // has a semantic that it returns data at least as fresh as provided RV.
          // So first try to LIST with setting RV to resource version of last observed object.
          logger.info('Watch of %s closed with: %s', this.expectedTypeName, err.message)
        } else if (!isAbortError(err)) {
          logger.warn('Watch of %s ended with: %s', this.expectedTypeName, err.message)
        }
        return
      }
    }
  }

  async watchHandler (response, timeout) {
    const begin = Date.now()
    let count = 0
    const timeoutCallack = () => {
      const message = `Forcefully destroying watch ${this.expectedTypeName} after ${timeout} ms`
      logger.error(message)
      response.destroy(new Error(message))
    }
    const timeoutId = setTimeout(timeoutCallack, timeout)
    try {
      for await (const event of response) {
        count++
        if (event instanceof Error) {
          throw event
        }
        const { type, object = {} } = event
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
    } finally {
      clearTimeout(timeoutId)
    }
    const duration = Date.now() - begin
    if (duration < 1000 && count === 0) {
      throw new Error(fmt('Very short watch %s - watch lasted less than a second and no items received', this.expectedTypeName))
    }
    logger.info('Watch %s closed - total %d items received within %s seconds', this.expectedTypeName, count, Math.floor(duration / 1000))
  }

  static create (...args) {
    return new this(...args)
  }
}

function assertSignal (signal) {
  if (!(signal instanceof AbortSignal)) {
    throw TypeError('The parameter "signal" must be an instance of AbortSignal')
  }
}

export default Reflector
