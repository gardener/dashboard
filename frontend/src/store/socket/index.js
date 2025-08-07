//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineStore,
  acceptHMRUpdate,
} from 'pinia'
import {
  computed,
  reactive,
  markRaw,
  watch,
} from 'vue'

import { useLogger } from '@/composables/useLogger'

import { createError } from '@/utils/errors'

import { useAuthnStore } from '../authn'
import { useShootStore } from '../shoot'
import { useTicketStore } from '../ticket'
import { useProjectStore } from '../project'
import { useSeedStore } from '../seed'

import { createSocket } from './helper'

const acknowledgementTimeout = 60_000

export const useSocketStore = defineStore('socket', () => {
  const logger = useLogger()

  const authnStore = useAuthnStore()
  const shootStore = useShootStore()
  const ticketStore = useTicketStore()
  const projectStore = useProjectStore()
  const seedStore = useSeedStore()

  const state = reactive({
    id: null,
    readyState: 'closed',
    active: false,
    connected: false,
    reason: null,
    error: null,
    backoff: {
      min: 1000,
      max: 5000,
      factor: 2,
      jitter: 0.5,
      attempts: 0,
    },
  })

  const synchronizing = new Map([
    ['shoots', false],
    ['projects', false],
    ['seeds', false],
  ])

  const socket = createSocket(state, {
    logger,
    authnStore,
    shootStore,
    ticketStore,
    projectStore,
    seedStore,
  })

  const id = computed(() => {
    return state.id
  })

  const readyState = computed(() => {
    return state.readyState
  })

  const active = computed(() => {
    return state.active || state.backoff.attempts > 0
  })

  const connected = computed(() => {
    return state.connected
  })

  const reason = computed(() => {
    return state.reason
  })

  const error = computed(() => {
    return state.error
  })

  // mutations
  function connect () {
    if (!socket.connected) {
      socket.connect()
    }
  }

  function disconnect () {
    socket.disconnect()
  }

  async function emitSubscribe (options) {
    if (!socket.connected) {
      return
    }
    const {
      statusCode = 500,
      message = 'Failed to subscribe shoots',
    } = await socket.timeout(acknowledgementTimeout).emitWithAck('subscribe', 'shoots', options)
    if (statusCode !== 200) {
      logger.debug('Subscribe Error: %s', message)
      throw createError(statusCode, message, {
        name: 'SubscribeError',
      })
    }
  }

  async function emitUnsubscribe () {
    const {
      statusCode = 500,
      message = 'Failed to unsubscribe shoots',
    } = await socket.timeout(acknowledgementTimeout).emitWithAck('unsubscribe', 'shoots')
    if (statusCode !== 200) {
      logger.debug('Unsubscribe Error: %s', message)
      throw createError(statusCode, message, {
        name: 'UnsubscribeError',
      })
    }
  }

  async function synchronize (key, uids) {
    if (!uids.length) {
      return []
    }
    if (synchronizing.get(key)) {
      throw createError(429, 'Synchronization is still in progress', { name: 'TooManyRequests' })
    }
    synchronizing.set(key, true)
    try {
      const {
        statusCode = 500,
        name = 'InternalError',
        message = `Failed to synchronize ${key}`,
        items = [],
      } = await socket.timeout(acknowledgementTimeout).emitWithAck('synchronize', key, uids)
      if (statusCode === 200) {
        return items
      }
      throw createError(statusCode, message, { name })
    } finally {
      synchronizing.set(key, false)
    }
  }

  watch(() => authnStore.user, value => {
    if (authnStore.isExpired()) {
      disconnect()
    } else {
      connect()
    }
  })

  return {
    socket: markRaw(socket),
    id,
    readyState,
    active,
    connected,
    reason,
    error,
    connect,
    disconnect,
    emitSubscribe,
    emitUnsubscribe,
    synchronize,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSocketStore, import.meta.hot))
}
