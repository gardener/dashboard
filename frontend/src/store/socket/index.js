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
import { useProjectStore } from '../project'
import { useShootStore } from '../shoot'
import { useTicketStore } from '../ticket'

import { createSocket } from './helper'

const acknowledgementTimeout = 60_000

export const useSocketStore = defineStore('socket', () => {
  const logger = useLogger()

  const authnStore = useAuthnStore()
  const projectStore = useProjectStore()
  const shootStore = useShootStore()
  const ticketStore = useTicketStore()

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
    synchronizing: false,
  })

  const socket = createSocket(state, {
    logger,
    authnStore,
    projectStore,
    shootStore,
    ticketStore,
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

  async function synchronize (uids) {
    if (!uids.length) {
      return []
    }
    if (state.synchronizing) {
      throw createError(429, 'Synchronization is still in progress', { name: 'TooManyRequests' })
    }
    state.synchronizing = true
    try {
      const {
        statusCode = 500,
        name = 'InternalError',
        message = 'Failed to synchronize shoots',
        items = [],
      } = await socket.timeout(acknowledgementTimeout).emitWithAck('synchronize', 'shoots', uids)
      if (statusCode === 200) {
        return items
      }
      throw createError(statusCode, message, { name })
    } finally {
      state.synchronizing = false
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
