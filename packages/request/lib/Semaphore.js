//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const kMaxConcurrency = Symbol('maxConcurrency')
const kReleased = Symbol('released')

class Semaphore {
  constructor (maxConcurrency = 100) {
    this[kMaxConcurrency] = maxConcurrency
    this.concurrency = 0
    this.queue = []
  }

  set maxConcurrency (value) {
    this[kMaxConcurrency] = value
    this.dispatch()
  }

  get maxConcurrency () {
    return this[kMaxConcurrency]
  }

  get value () {
    return this.maxConcurrency - this.concurrency - this.queue.length
  }

  acquire () {
    const ticket = new Promise(resolve => {
      resolve[kReleased] = false
      this.queue.push(resolve)
    })
    this.dispatch()
    return ticket
  }

  dispatch () {
    while (this.concurrency < this.maxConcurrency && this.queue.length) {
      const resolve = this.queue.shift()
      this.concurrency++
      const releaser = () => {
        if (!resolve[kReleased]) {
          resolve[kReleased] = true
          this.concurrency--
          this.dispatch()
        }
      }
      resolve([releaser, this.concurrency])
    }
  }
}

module.exports = Semaphore
