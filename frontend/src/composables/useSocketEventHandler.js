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

export function createDefaultOperator (state) {
  if (Array.isArray(state.list)) {
    return createListOperator(state.list)
  }
}

export function createListOperator (list) {
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

export function useSocketEventHandler (useStore, options = {}) {
  const {
    logger = useLogger(),
    socketStore = useSocketStore(),
    visibility = useDocumentVisibility(),
    createOperator = createDefaultOperator,
  } = options

  const eventMap = new Map([])

  async function handleEvents (store) {
    const pluralName = store.$id + 's'
    const events = Array.from(eventMap.values())
    eventMap.clear()
    try {
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
      const items = await socketStore.synchronize(pluralName, uids)
      for (const item of items) {
        if (item.kind === 'Status') {
          logger.info('Failed to synchronize a single %s: %s', store.$id, item.message)
          if (item.code === 404) {
            const uid = item.details?.uid
            if (uid) {
              uidMap.set(uid, false)
            }
          }
        } else {
          const uid = item.metadata.uid
          uidMap.set(uid, item)
        }
      }
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
      if (isTooManyRequestsError(err)) {
        logger.info('Skipped synchronization of modified %s: %s', pluralName, err.message)
      } else {
        logger.error('Failed to synchronize modified %s: %s', pluralName, err.message)
      }
      // Synchronization failed -> Rollback events
      for (const event of events) {
        const { uid } = event
        if (!eventMap.has(uid)) {
          eventMap.set(uid, event)
        }
      }
    }
  }

  let throttledHandleEvents

  function cancelTrailingInvocation () {
    if (typeof throttledHandleEvents?.cancel === 'function') {
      throttledHandleEvents.cancel()
    }
  }

  function start (wait = 500) {
    cancelTrailingInvocation()
    eventMap.clear()
    const store = useStore()
    const handleEventsWithParams = partial(handleEvents, store)
    throttledHandleEvents = wait > 0
      ? throttle(handleEventsWithParams, wait)
      : handleEventsWithParams
    return throttledHandleEvents
  }

  function stop () {
    cancelTrailingInvocation()
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
    if (visibility.value !== 'visible') {
      return
    }
    throttledHandleEvents()
  }

  watch(visibility, (current, previous) => {
    if (typeof throttledHandleEvents !== 'function') {
      return
    }
    if (current === 'visible' && previous === 'hidden') {
      throttledHandleEvents()
    }
  })

  return {
    start,
    stop,
    listener,
  }
}
