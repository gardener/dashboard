//
// SPDX-FileCopyrightText: 2014 The Kubernetes Authors
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

// This file contains code adapted from k8s.io/client-go/tools/cache/reflector.go.

import { format as fmt } from 'node:util'
import timers from 'timers/promises'
import { isPlainObject } from 'lodash-es'
import { globalLogger as logger } from '@gardener-dashboard/logger'
import ListPager from './ListPager.js'
import BackoffManager from './BackoffManager.js'
import Store from './Store.js'
import {
  isExpiredError,
  isConnectionRefused,
  isTooManyRequests,
  isTooLargeResourceVersionError,
  isAbortError,
  StatusError,
} from '../ApiErrors.js'
import { getResourceApiVersion, normalizeResourceListItems } from '../resource.js'

const MOST_RECENT_PAGINATED = 'mostRecentPaginated'
const INITIAL_EVENTS_END_BOOKMARK_WARNING_INTERVAL = 10_000

function delay (milliseconds, signal) {
  return timers.setTimeout(milliseconds, undefined, { signal })
}

function randomize (duration) {
  return Math.round(duration * (Math.random() + 1.0))
}

function getTypeName (apiVersion, kind) {
  return `${apiVersion}, Kind=${kind}`
}

// isWatchErrorRetriable determines if it is safe to retry
// a watch error retrieved from the server.
function isWatchErrorRetriable (err) {
  // If this is "connection refused" error, it means that most likely apiserver is not responsive.
  // It doesn't make sense to re-list all objects because most likely we will be able to restart
  // watch where we ended.
  // If that's the case begin exponentially backing off and resend watch request.
  // Do the same for "429" errors.
  return isConnectionRefused(err) || isTooManyRequests(err)
}

class Reflector {
  constructor (listWatcher, store, options) {
    const { strategy, pageSize } = validateReflectorOptions(options)
    this.listWatcher = listWatcher
    this.store = store
    this.strategy = strategy
    this.pageSize = pageSize
    this.minWatchTimeout = 300 // 5 minutes
    this.isLastSyncResourceVersionUnavailable = false
    this.lastSyncResourceVersion = ''
    this.paginatedResult = false
    this.useWatchList = true
    this.stopRequested = false
    this.backoffManager = new BackoffManager()
    this.signal = undefined
  }

  get apiVersion () {
    return getResourceApiVersion(this.listWatcher)
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
      if (this.strategy === MOST_RECENT_PAGINATED) {
        return ''
      }
      // For performance reasons, initial list performed by reflector uses "0" as resource version to allow it to
      // be served from the watch cache if it is enabled.
      return '0'
    }
    return this.lastSyncResourceVersion
  }

  get relistOptions () {
    const resourceVersion = this.relistResourceVersion
    if (this.strategy !== MOST_RECENT_PAGINATED) {
      return { resourceVersion }
    }
    if (!resourceVersion) {
      return {}
    }
    return {
      resourceVersion,
      resourceVersionMatch: 'NotOlderThan',
    }
  }

  // rewatchResourceVersion determines the resource version the reflector should start streaming from.
  get rewatchResourceVersion () {
    if (this.isLastSyncResourceVersionUnavailable) {
      // Initial stream should return data at the most recent resource version.
      // The returned data must be consistent i.e. as if served from etcd via a quorum read.
      return ''
    }
    return this.lastSyncResourceVersion
  }

  destroy () {
    this.backoffManager.clearTimeout()
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
      try {
        await delay(this.backoffManager.duration(), this.signal)
      } catch (err) {
        if (isAbortError(err)) {
          break
        }
        throw err
      }
      logger.info('Restarting reflector %s', this.expectedTypeName)
    }
    logger.info('Stopped reflector %s', this.expectedTypeName)
  }

  syncWith (items, resourceVersion) {
    normalizeResourceListItems({ items }, this.listWatcher)
    this.store.replace(items, resourceVersion)
  }

  async list () {
    const pager = this.strategy === MOST_RECENT_PAGINATED
      ? ListPager.create(this.listWatcher, {
        pageSize: this.pageSize,
        fullListIfExpired: false,
      })
      : ListPager.create(this.listWatcher)
    let options = this.relistOptions

    if (this.strategy !== MOST_RECENT_PAGINATED) {
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
          logger.debug('Retrying recovery list %s', this.expectedTypeName)
          options = this.relistOptions
          list = await pager.list(options)
        } catch (err) {
          logger.error('Failed to call recovery list %s: %s', this.expectedTypeName, err.message)
          return false
        }
      } else {
        logger.error('Failed to call paginated list %s: %s', this.expectedTypeName, err.message)
        return false
      }
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
    return true
  }

  async listAndWatch () {
    let response
    let iterator
    let timeoutSeconds

    try {
      if (this.useWatchList) {
        try {
          ({ response, iterator, timeoutSeconds } = await this.watchList())
        } catch (err) {
          if (this.signal.aborted || isAbortError(err)) {
            return
          }
          logger.debug(
            "Data couldn't be fetched in WatchList mode for %s. Falling back to regular list. This is expected if WatchList is not supported or disabled in kube-apiserver: %s",
            this.expectedTypeName,
            err.message,
          )
        }
      }

      if (this.signal.aborted || (!response && !await this.list())) {
        return
      }

      while (!this.signal.aborted) {
        const gracePeriod = 5
        let propagateResourceVersionFromStart = true
        if (!response) {
          timeoutSeconds = randomize(this.minWatchTimeout)
          const options = {
            allowWatchBookmarks: true,
            timeoutSeconds,
            resourceVersion: this.lastSyncResourceVersion,
          }
          if (options.resourceVersion === '' || options.resourceVersion === '0') {
            // If we're starting the watch at a resource version that will get synthetic ADDED events in non-rv order,
            // wait until we're through that set of events before propagating the RV.
            propagateResourceVersionFromStart = false
          }
          try {
            logger.debug('Watch %s with resourceVersion %s', this.expectedTypeName, options.resourceVersion)
            response = await this.listWatcher.watch(options)
          } catch (err) {
            if (isWatchErrorRetriable(err)) {
              logger.info('Watch of %s failed with a retriable error: %s', this.expectedTypeName, err.message)
              try {
                await delay(this.backoffManager.duration(), this.signal)
              } catch (err) {
                if (isAbortError(err)) {
                  return
                }
                throw err
              }
              continue
            }
            throw err
          }
        }
        try {
          await this.watchHandler(response, (timeoutSeconds + gracePeriod) * 1000, {
            iterator,
            setLastSyncResourceVersion: (resourceVersion, eventReceivedBesidesAdded) => {
              // We update the resource version only if we have received at least one event that is
              // not an added event, or if the resource version has been set previously. This is because we can
              // encounter 2 scenarios:
              // 1. The watch is started from a resource version specified by the lastSyncResourceVersion field.
              //    In this case, we can update the resource version without worrying about it being
              //    out of order since we will not receive any synthetic added events for resources that may be
              //    out of order.
              // 2. The watch is started when the lastSyncResourceVersion field is empty. In this case, we may not
              //    update the lastSyncResourceVersion until we receive at least one event that is not an added
              //    event, since that is the only way to ensure that the watch has exited the initial list phase.
              if (propagateResourceVersionFromStart || eventReceivedBesidesAdded) {
                this.lastSyncResourceVersion = resourceVersion
              }
            },
          })
        } catch (err) {
          response?.destroy?.()
          response = undefined
          iterator = undefined
          if (isExpiredError(err)) {
            // Don't set LastSyncResourceVersionUnavailable - LIST call with ResourceVersion=RV already
            // has a semantic that it returns data at least as fresh as provided RV.
            // So first try to LIST with setting RV to resource version of last observed object.
            logger.info('Watch of %s closed with: %s', this.expectedTypeName, err.message)
          } else if (isTooManyRequests(err)) {
            logger.info('Watch of %s returned 429 - backing off', this.expectedTypeName)
            try {
              await delay(this.backoffManager.duration(), this.signal)
            } catch (err) {
              if (isAbortError(err)) {
                return
              }
              throw err
            }
            continue
          } else if (!isAbortError(err)) {
            logger.warn('Watch of %s ended with: %s', this.expectedTypeName, err.message)
          }
          return
        }
        response = undefined
        iterator = undefined
      }
    } finally {
      response?.destroy?.()
    }
  }

  async watchList () {
    while (true) {
      this.signal.throwIfAborted()
      const timeoutSeconds = randomize(this.minWatchTimeout)
      const gracePeriod = 5
      const options = {
        sendInitialEvents: true,
        allowWatchBookmarks: true,
        resourceVersion: this.rewatchResourceVersion,
        resourceVersionMatch: 'NotOlderThan',
        timeoutSeconds,
      }
      const temporaryStore = new Store()
      let response

      try {
        logger.debug('WatchList %s with resourceVersion %s', this.expectedTypeName, options.resourceVersion)
        response = await this.listWatcher.watch(options)
        const iterator = response[Symbol.asyncIterator]()
        let resourceVersion = ''
        const { watchListBookmarkReceived } = await this.watchHandler(
          response,
          (timeoutSeconds + gracePeriod) * 1000,
          {
            iterator,
            store: temporaryStore,
            exitOnWatchListBookmarkReceived: true,
            setLastSyncResourceVersion: (value, eventReceivedBesidesAdded, initialEventsEndBookmarkReceived) => {
              if (eventReceivedBesidesAdded && initialEventsEndBookmarkReceived) {
                resourceVersion = value
              }
            },
          },
        )
        if (!watchListBookmarkReceived) {
          response.destroy?.()
          continue
        }
        if (!resourceVersion) {
          throw new Error(`WatchList ${this.expectedTypeName} received an initial-events-end bookmark without a resource version`)
        }

        // We successfully got initial state from WatchList confirmed by the
        // "k8s.io/initial-events-end" bookmark.
        this.isLastSyncResourceVersionUnavailable = false
        this.syncWith(temporaryStore.list(), resourceVersion)
        this.lastSyncResourceVersion = resourceVersion
        logger.debug('WatchList of %s successfully streamed %d items', this.expectedTypeName, temporaryStore.list().length)
        return { response, iterator, timeoutSeconds }
      } catch (err) {
        response?.destroy?.()
        if (this.signal.aborted || isAbortError(err)) {
          throw err
        }
        if (isWatchErrorRetriable(err)) {
          logger.info('WatchList of %s failed with a retriable error, backing off: %s', this.expectedTypeName, err.message)
          await delay(this.backoffManager.duration(), this.signal)
          continue
        }
        if (isExpiredError(err) || isTooLargeResourceVersionError(err)) {
          // We tried to re-establish a watch request but the provided RV has either expired
          // or it is greater than the server knows about. Reset the RV and try to get a
          // consistent snapshot from the watch cache.
          this.isLastSyncResourceVersionUnavailable = true
          continue
        }
        throw err
      }
    }
  }

  // watchHandler consumes events from a response, updates the Store, and records the last
  // seen ResourceVersion, to allow continuing from that ResourceVersion on retry.
  // If exitOnWatchListBookmarkReceived is true, the watch events will be consumed until a
  // bookmark event is received with the WatchList annotation present. The iterator remains
  // open in that case, allowing the caller to continue consuming the same watch stream.
  async watchHandler (response, timeout, options = {}) {
    const {
      iterator = response[Symbol.asyncIterator](),
      store = this.store,
      exitOnWatchListBookmarkReceived = false,
      setLastSyncResourceVersion = resourceVersion => {
        this.lastSyncResourceVersion = resourceVersion
      },
    } = options
    const begin = Date.now()
    let count = 0
    let eventReceivedBesidesAdded = false
    let watchListBookmarkReceived = false
    let iteratorDone = false
    let leaveIteratorOpen = false
    let lastEventTime
    const timeoutCallack = () => {
      const message = `Forcefully destroying watch ${this.expectedTypeName} after ${timeout} ms`
      logger.error(message)
      response.destroy(new Error(message))
    }
    const timeoutId = setTimeout(timeoutCallack, timeout)
    const bookmarkWarningIntervalId = exitOnWatchListBookmarkReceived
      ? setInterval(() => {
        if (lastEventTime === undefined) {
          logger.info(
            '%s: awaiting required bookmark event for initial events stream, no events received for %d seconds',
            this.expectedTypeName,
            Math.floor((Date.now() - begin) / 1000),
          )
          return
        }
        const elapsed = Date.now() - lastEventTime
        if (elapsed >= INITIAL_EVENTS_END_BOOKMARK_WARNING_INTERVAL) {
          logger.info(
            "%s: hasn't received required bookmark event marking the end of initial events stream, received last event %d seconds ago",
            this.expectedTypeName,
            Math.floor(elapsed / 1000),
          )
        }
      }, INITIAL_EVENTS_END_BOOKMARK_WARNING_INTERVAL)
      : undefined
    try {
      while (true) {
        const { value: event, done } = await iterator.next()
        if (done) {
          iteratorDone = true
          break
        }
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
            store.add(object)
            break
          case 'MODIFIED':
            eventReceivedBesidesAdded = true
            store.update(object)
            break
          case 'DELETED':
            eventReceivedBesidesAdded = true
            store.delete(object)
            break
          case 'BOOKMARK':
            eventReceivedBesidesAdded = true
            if (object.metadata?.annotations?.['k8s.io/initial-events-end'] === 'true') {
              watchListBookmarkReceived = true
            }
            break
          default:
            logger.error('Unable to understand event %s for watch %s', type, this.expectedTypeName)
        }
        if (resourceVersion) {
          setLastSyncResourceVersion(resourceVersion, eventReceivedBesidesAdded, watchListBookmarkReceived)
        } else {
          logger.error('Received event object without resource version for watch %s', this.expectedTypeName)
        }
        lastEventTime = Date.now()
        if (exitOnWatchListBookmarkReceived && watchListBookmarkReceived) {
          leaveIteratorOpen = true
          return { iterator, watchListBookmarkReceived }
        }
      }
    } finally {
      clearTimeout(timeoutId)
      clearInterval(bookmarkWarningIntervalId)
      if (!iteratorDone && !leaveIteratorOpen) {
        await iterator.return?.()
      }
    }
    const duration = Date.now() - begin
    if (duration < 1000 && count === 0) {
      throw new Error(fmt('Very short watch %s - watch lasted less than a second and no items received', this.expectedTypeName))
    }
    logger.info('Watch %s closed - total %d items received within %s seconds', this.expectedTypeName, count, Math.floor(duration / 1000))
    return { iterator, watchListBookmarkReceived }
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

function validateReflectorOptions (options) {
  if (options === undefined) {
    return {}
  }
  if (!isPlainObject(options)) {
    throw new TypeError('The reflector options must be a plain object')
  }
  const unsupportedOption = Object.keys(options).find(key => !['strategy', 'pageSize'].includes(key))
  if (unsupportedOption) {
    throw new TypeError(`Unsupported reflector option "${unsupportedOption}"`)
  }
  const { strategy, pageSize } = options
  if (strategy === undefined) {
    if (pageSize !== undefined) {
      throw new TypeError('The reflector option "pageSize" requires a strategy')
    }
    return {}
  }
  if (strategy !== MOST_RECENT_PAGINATED) {
    throw new TypeError(`Unsupported reflector strategy "${strategy}"`)
  }
  if (!Number.isSafeInteger(pageSize) || pageSize <= 0) {
    throw new TypeError('The reflector option "pageSize" must be a positive safe integer')
  }
  return { strategy, pageSize }
}

export default Reflector
