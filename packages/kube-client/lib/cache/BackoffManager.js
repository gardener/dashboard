//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

class BackoffManager {
  constructor (options = {}) {
    // Match client-go's reflector backoff policy for reducing load while the API server is unhealthy.
    // Positive jitter is applied after the 30000 ms base cap, producing a [30000, 60000) ms
    // terminal retry interval. The backoff resets after 120000 ms.
    const {
      min = 800,
      max = 30 * 1000,
      resetDuration = 120 * 1000,
      factor = 2,
      jitter = 1,
    } = options
    this.min = min
    this.max = max
    this.factor = factor
    this.jitter = jitter > 0 && jitter <= 1 ? jitter : 0
    this.resetDuration = resetDuration
    this.attempt = 0
    this.timeoutId = undefined
  }

  duration () {
    if (this.timeoutId === undefined) {
      this.timeoutId = setTimeout(() => {
        this.reset()
        this.timeoutId = undefined
      }, this.resetDuration)
    }

    const base = Math.min(this.min * Math.pow(this.factor, this.attempt), this.max)
    this.attempt += 1
    if (this.jitter) {
      return Math.floor(base + this.jitter * Math.random() * base)
    }
    return Math.floor(base)
  }

  reset () {
    this.attempt = 0
  }

  clearTimeout () {
    clearTimeout(this.timeoutId)
    this.timeoutId = undefined
  }
}

export default BackoffManager
