//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import forEach from 'lodash/forEach'
import concat from 'lodash/concat'
import throttle from 'lodash/throttle'
import toLower from 'lodash/toLower'
import get from 'lodash/get'
import filter from 'lodash/filter'

class ThrottledEmitter {
  constructor ({ emitter, wait = 1000 }) {
    this.wait = wait

    this.eventsBuffer = {}

    this.throttledEmitEvents = throttle(() => {
      forEach(this.eventsBuffer, (value, objectKind) => {
        emitter.emit(objectKind, value)
      })
      this.eventsBuffer = {}
    }, this.wait)
  }

  emit (kind, value) {
    const objectKind = toLower(kind)

    this.appendValue(objectKind, value)
    this.throttledEmitEvents()
  }

  appendValue (objectKind, value) {
    throw new Error('implement in subclass!')
  }

  flush () {
    this.throttledEmitEvents.flush()
  }

  _replaceOldEventsWithSameKey (bufferedEvents, newEvents) {
    forEach(newEvents, event => {
      const filterEventsWithSameKeyPredicate = bufferedEvent => {
        if (!bufferedEvent.objectKey || !event.objectKey) {
          return true
        }
        return bufferedEvent.objectKey !== event.objectKey
      }

      bufferedEvents = filter(bufferedEvents, filterEventsWithSameKeyPredicate)
    })
    bufferedEvents = concat(bufferedEvents, newEvents)

    return bufferedEvents
  }
}

class ThrottledNamespacedEventEmitter extends ThrottledEmitter {
  appendValue (objectKind, namespaces) {
    forEach(namespaces, (events, namespace) => {
      this.eventsBuffer[objectKind] = get(this.eventsBuffer, objectKind, {})
      this.eventsBuffer[objectKind][namespace] = get(this.eventsBuffer, `${objectKind}.${namespace}`, [])
      this.eventsBuffer[objectKind][namespace] = this._replaceOldEventsWithSameKey(this.eventsBuffer[objectKind][namespace], events)
    })
  }
}

export default ThrottledNamespacedEventEmitter
