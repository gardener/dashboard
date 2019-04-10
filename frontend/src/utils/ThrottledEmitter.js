//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
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
