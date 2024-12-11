//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { useLogger } from '@/composables/useLogger'

import { isTooManyRequestsError } from '@/utils/errors'

import throttle from 'lodash/throttle'
import findIndex from 'lodash/findIndex'

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

export function useEventHandler (options = {}) {
  const {
    logger = useLogger(),
    wait = 500,
  } = options

  const eventMap = new Map([])

  async function handleEvents (store) {
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
      const items = await store.synchronize(uids)
      for (const item of items) {
        if (item.kind === 'Status') {
          logger.info('Failed to synchronize a single project: %s', item.message)
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
        const listOperator = createListOperator(state.list)
        for (const [uid, item] of uidMap) {
          if (typeof item === 'boolean' && !item) {
            listOperator.delete(uid)
          }
        }
        for (const [uid, item] of uidMap) {
          if (typeof item === 'object' && item) {
            listOperator.set(uid, item)
          }
        }
      })
    } catch (err) {
      if (isTooManyRequestsError(err)) {
        logger.info('Skipped synchronization of modified projects: %s', err.message)
      } else {
        logger.error('Failed to synchronize modified projects: %s', err.message)
      }
      // Synchronization failed. Rollback events
      for (const event of events) {
        const { uid } = event
        if (!eventMap.has(uid)) {
          eventMap.set(uid, event)
        }
      }
    }
  }

  const throttledHandleEvents = throttle(handleEvents, wait)

  function handleEvent (event) {
    const { type, uid } = event
    if (!['ADDED', 'MODIFIED', 'DELETED'].includes(type)) {
      logger.error('undhandled event type', type)
      return
    }
    eventMap.set(uid, event)
    throttledHandleEvents(this)
  }

  return handleEvent
}
