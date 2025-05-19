//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const kReleased = Symbol('released')

function setReleased (obj, value) {
  obj[kReleased] = value // eslint-disable-line security/detect-object-injection
}

class Semaphore {
  #maxConcurrency = 0

  constructor (maxConcurrency = 100) {
    this.#maxConcurrency = maxConcurrency
    this.concurrency = 0
    this.queue = []
  }

  set maxConcurrency (value) {
    this.#maxConcurrency = value
    this.dispatch()
  }

  get maxConcurrency () {
    return this.#maxConcurrency
  }

  get value () {
    return this.maxConcurrency - this.concurrency - this.queue.length
  }

  acquire () {
    const ticket = new Promise(resolve => {
      setReleased(resolve, false)
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
        const { [kReleased]: released } = resolve
        if (!released) {
          setReleased(resolve, true)
          this.concurrency--
          this.dispatch()
        }
      }
      resolve([releaser, this.concurrency])
    }
  }
}

export default Semaphore
