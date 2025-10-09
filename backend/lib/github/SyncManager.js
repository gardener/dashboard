//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import logger from '../logger/index.js'

class SyncManager {
  ready = false
  #load
  #retryPeriod
  #interval
  #throttle
  #idleSyncTimeoutId
  #lastInvokeTime = 0
  #scheduledInvocationTimeoutId

  constructor (loadFunc, { interval, throttle, signal }) {
    signal.addEventListener('abort', () => this.#stop(), { once: true })

    this.#interval = interval
    this.#throttle = throttle
    this.#load = loadFunc
    this.#retryPeriod = throttle || Math.floor(60_000 * (0.5 + Math.random()))
  }

  /**
   * Calls #load() and will automatically trigger a regular re-sync by calling
   * .sync() after #interval ms after the last completed call. If the first call/sync encounters an
   * error #retryPeriod is used instead of #interval. #retryPeriod should be lower then
   * #syncPeriod. This way, in case of an error during the initial data load, we avoid staying
   * too long in the unintialized state.
   */
  async #invokeLoad () {
    clearTimeout(this.#idleSyncTimeoutId)
    try {
      logger.debug('Starting synchronization of GitHub issues and comments')
      await this.#load()
      logger.info('GitHub issues and comments successfully synchronized')
      this.ready = true
    } catch (err) {
      logger.error('Failed to load open GitHub issues and comments: %s', err.message)
    } finally {
      const delay = this.ready ? this.#interval : this.#retryPeriod
      if (delay) {
        this.#idleSyncTimeoutId = setTimeout(() => this.sync(), delay)
      }
    }
  }

  /**
   * Calls #load() but throttles calls to it by allowing only one invocation
   * at a time and only once every #throttlePeriod ms.
   */
  async #throttledLoad () {
    clearTimeout(this.#scheduledInvocationTimeoutId)
    const wait = Math.max(0, this.#lastInvokeTime + this.#throttle - Date.now())
    if (wait) {
      logger.debug(`GitHub synchronization delayed due to throttling for ${wait / 1000}s`)
    }
    this.#scheduledInvocationTimeoutId = setTimeout(() => {
      this.#lastInvokeTime = Date.now()
      this.#invokeLoad()
    }, wait)
  }

  /**
   * To be called by externals in a fire-and-forget fashion. Depending on internal handled
   * throttling etc. a call to sync does not necessarily lead to an immediate sync. No values
   * or errors are returned or thrown.
   */
  sync () {
    this.#throttledLoad()
  }

  #stop () {
    clearTimeout(this.#idleSyncTimeoutId)
    clearTimeout(this.#scheduledInvocationTimeoutId)
  }
}

export default SyncManager
