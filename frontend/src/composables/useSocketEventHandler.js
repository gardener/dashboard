//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { watch } from 'vue'
import { useDocumentVisibility } from '@vueuse/core'

import { useSocketStore } from '@/store/socket'

import { useLogger } from '@/composables/useLogger'

import { isTooManyRequestsError } from '@/utils/errors'

import partial from 'lodash/partial'
import throttle from 'lodash/throttle'
import findIndex from 'lodash/findIndex'

class StoreNotInitializedError extends Error {
  constructor () {
    super('store not yet initialized')
    this.name = 'StoreNotInitializedError'
  }
}

function isStoreNotInitializedError (err) {
  return err instanceof StoreNotInitializedError
}

export function createDefaultOperator (state) {
  if (state.list === null) {
    throw new StoreNotInitializedError()
  }
  return createListOperator(state.list)
}

export function createListOperator (list) {
  if (!Array.isArray(list)) {
    throw new TypeError('Argument `list` must be an array')
  }
  return {
    delete (uid) {
      const index = findIndex(list, ['metadata.uid', uid])
      if (index !== -1) {
        list.splice(index, 1)
      }
    },
    set (uid, item) {
      const index = findIndex(list, ['metadata.uid', uid])
      if (index !== -1) {
        list.splice(index, 1, item)
      } else {
        list.push(item)
      }
    },
  }
}

function isStoreInitialized (store) {
  return store.isInitial !== true
}

export function useSocketEventHandler (useStore, options = {}) {
  const {
    logger = useLogger(),
    socketStore = useSocketStore(),
    visibility = useDocumentVisibility(),
    createOperator = createDefaultOperator,
    getSynchronizeOptions,
    isInitialized = isStoreInitialized,
  } = options

  const eventMap = new Map([])

  function restoreEvents (events) {
    for (const event of events) {
      const { uid } = event
      if (!eventMap.has(uid)) {
        eventMap.set(uid, event)
      }
    }
  }

  function flushEvents (store) {
    if (!eventMap.size) {
      return
    }
    if (!isInitialized(store)) {
      return
    }
    if (visibility.value !== 'visible') {
      return
    }
    throttledHandleEvents()
  }

  async function handleEvents (store) {
    if (!isInitialized(store)) {
      return
    }
    const pluralName = store.$id + 's'
    const events = Array.from(eventMap.values())
    if (!events.length) {
      return
    }
    eventMap.clear()
    const uidMap = new Map()
    const uids = []
    for (const { type, uid } of events) {
      if (type === 'DELETED') {
        uidMap.set(uid, false)
      } else {
        uidMap.set(uid, true)
        uids.push(uid)
      }
    }
    let items
    try {
      items = getSynchronizeOptions
        ? await socketStore.synchronize(pluralName, uids, getSynchronizeOptions(store))
        : await socketStore.synchronize(pluralName, uids)
    } catch (err) {
      if (isTooManyRequestsError(err)) {
        logger.info('Skipped synchronization of modified %s: %s', pluralName, err.message)
      } else {
        logger.error('Failed to synchronize modified %s: %s', pluralName, err.message)
      }
      // Synchronization failed -> Rollback events
      restoreEvents(events)
      return
    }
    if (!isInitialized(store)) {
      restoreEvents(events)
      return
    }
    for (const item of items) {
      if (item.kind !== 'Status') {
        uidMap.set(item.metadata.uid, item)
        continue
      }

      logger.info('Failed to synchronize a single %s: %s', store.$id, item.message)

      if (item.code !== 404) {
        continue
      }

      const uid = item.details?.uid
      if (!uid) {
        continue
      }

      uidMap.set(uid, false)
    }
    try {
      store.$patch(state => {
        const operator = createOperator(state)
        // Delete items first
        for (const [uid, item] of uidMap) {
          if (typeof item === 'boolean' && !item) {
            operator.delete(uid)
          }
        }
        // Update items
        for (const [uid, item] of uidMap) {
          if (typeof item === 'object' && item) {
            operator.set(uid, item)
          }
        }
      })
    } catch (err) {
      if (isStoreNotInitializedError(err)) {
        logger.debug('Skipped synchronization of %s: store not yet initialized', pluralName)
        restoreEvents(events)
        return
      }
      logger.error('Failed to apply synchronized %s: %s', pluralName, err.message)
    }
  }

  let throttledHandleEvents
  let unwatchInitialization

  function cancelTrailingInvocation () {
    if (typeof throttledHandleEvents?.cancel === 'function') {
      throttledHandleEvents.cancel()
    }
  }

  function teardownInitializationWatch () {
    if (typeof unwatchInitialization === 'function') {
      unwatchInitialization()
      unwatchInitialization = undefined
    }
  }

  function start (wait = 500) {
    cancelTrailingInvocation()
    teardownInitializationWatch()
    eventMap.clear()
    const store = useStore()
    const handleEventsWithParams = partial(handleEvents, store)
    throttledHandleEvents = wait > 0
      ? throttle(handleEventsWithParams, wait)
      : handleEventsWithParams
    unwatchInitialization = watch(() => isInitialized(store), value => {
      if (value) {
        flushEvents(store)
      }
    })
    return throttledHandleEvents
  }

  function stop () {
    cancelTrailingInvocation()
    teardownInitializationWatch()
    eventMap.clear()
    throttledHandleEvents = undefined
  }

  function listener (event) {
    if (typeof throttledHandleEvents !== 'function') {
      return
    }
    const { type, uid } = event
    if (!['ADDED', 'MODIFIED', 'DELETED'].includes(type)) {
      logger.error('Invalid event type', type)
      return
    }
    eventMap.set(uid, event)
    flushEvents(useStore())
  }

  watch(visibility, (current, previous) => {
    if (typeof throttledHandleEvents !== 'function') {
      return
    }
    if (current === 'visible' && previous === 'hidden') {
      flushEvents(useStore())
    }
  })

  return {
    start,
    stop,
    listener,
  }
}
