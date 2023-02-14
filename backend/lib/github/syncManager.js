//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const logger = require('../logger')

class SyncManager {
  ready = false
  #throttled = false
  #loadTickets
  #loadHasPendingExec
  #retryPeriod
  #interval
  #syncPeriodTimeoutId
  #throttle
  #throttleTimeoutId

  constructor ({ interval, throttle, signal, loadTickets }) {
    signal.addEventListener('abort', () => this.#stop(), { once: true })

    this.#interval = interval
    this.#throttle = throttle
    this.#loadTickets = loadTickets
    this.#retryPeriod = throttle || parseInt(30_000 + Math.random() * 60_000, 10)
  }

  /**
   * Calls #loadTickets() and will automatically trigger a regular re-sync by calling
   * .sync() after #interval ms after the last completed call. If the first call/sync encounters an
   * error #retryPeriod is used instead of #interval. #retryPeriod should be lower then
   * #syncPeriod. This way, in case of an error during the initial data load, we avoid staying
   * too long in the unintialized state.
   */
  async #load () {
    clearTimeout(this.#syncPeriodTimeoutId)
    try {
      await this.#loadTickets()
      this.ready = true
    } catch (err) {
      logger.error('Failed to load open issues and comments: %s', err.message)
    } finally {
      const delay = this.ready ? this.#interval : this.#retryPeriod
      if (delay) {
        this.#syncPeriodTimeoutId = setTimeout(() => this.sync(), delay)
      }
    }
  }

  /**
   * Calls #load() but throttles calls to it by allowing only one invocation
   * at a time and only once every #throttlePeriod ms.
   * @returns {undefined}
   */
  async #throttledLoad () {
    if (this.#throttled) {
      this.#loadHasPendingExec = true
      return
    }

    const execStart = Date.now()
    this.#throttled = true

    await this.#load()

    const execDuration = Date.now() - execStart
    const unthrottleDelay = Math.max(0, this.#throttle - execDuration)
    const unthrottle = () => {
      this.#throttled = false
      if (this.#loadHasPendingExec) {
        this.#loadHasPendingExec = false
        this.#throttledLoad()
      }
    }
    this.#throttleTimeoutId = setTimeout(unthrottle, unthrottleDelay)
  }

  /**
   * To be called by externals in a fire-and-forget fashion. Depending on internal handled
   * throttling etc. a call to sync does not necessarily lead to an immediate sync. No errors
   * or values are returned/thrown.
   */
  sync () {
    this.#throttledLoad()
  }

  start () {
    this.sync()
  }

  #stop () {
    clearTimeout(this.#syncPeriodTimeoutId)
    clearTimeout(this.#throttleTimeoutId)
  }
}

module.exports = SyncManager
