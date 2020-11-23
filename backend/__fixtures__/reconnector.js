//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { EventEmitter } = require('events')
const WatchBuilder = require('@gardener-dashboard/kube-client/lib/WatchBuilder')

class Reconnector extends EventEmitter {
  constructor () {
    super()
    this.disconnected = false
    this.events = []
  }

  disconnect () {
    this.disconnected = true
  }

  pushEvent (type, object, delay = 10) {
    this.events.push({ delay, event: { type, object } })
  }

  start () {
    const emit = (event) => {
      return () => {
        this.emit('event', event)
        process.nextTick(shift)
      }
    }
    const shift = () => {
      if (this.events.length) {
        const { delay, event } = this.events.shift()
        setTimeout(emit(event), delay)
      }
    }
    shift()
    return this
  }
}

function createReconnector (events = [], name) {
  const reconnector = new Reconnector()
  for (const args of events) {
    reconnector.pushEvent(...args)
  }
  reconnector.resourceName = name
  WatchBuilder.setWaitFor(reconnector)
  return reconnector
}

module.exports = {
  create (...args) {
    return createReconnector(...args)
  }
}
