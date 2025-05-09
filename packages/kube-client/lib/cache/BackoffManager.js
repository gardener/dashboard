//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

class BackoffManager {
  constructor (options = {}) {
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

export default BackoffManager
