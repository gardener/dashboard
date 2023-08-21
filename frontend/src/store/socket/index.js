//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import {
  computed,
  reactive,
  markRaw,
} from 'vue'

import { useLogger } from '@/composables/useLogger'

import { useAuthnStore } from '../authn'
import { useProjectStore } from '../project'
import { useShootStore } from '../shoot'
import { constants } from '../shoot/helper'
import { useTicketStore } from '../ticket'

import { createSocket } from './helper'

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

  function emitSubscribe (options) {
    if (socket.connected) {
      socket.emit('subscribe', 'shoots', options, ({ statusCode, message }) => {
        if (statusCode === 200) {
          logger.debug('subscribed shoots')
          shootStore.setSubscriptionState(constants.OPEN)
        } else {
          const err = new Error(message)
          err.name = 'SubscribeError'
          logger.debug('failed to subscribe shoots: %s', err.message)
          shootStore.setSubscriptionError(err)
        }
      })
    }
  }

  function emitUnsubscribe () {
    socket.emit('unsubscribe', 'shoots', ({ statusCode, message }) => {
      if (statusCode === 200) {
        logger.debug('unsubscribed shoots')
        shootStore.setSubscriptionState(constants.CLOSED)
      } else {
        const err = new Error(message)
        err.name = 'UnsubscribeError'
        logger.debug('failed to unsubscribe shoots: %s', err.message)
        shootStore.setSubscriptionError(err)
      }
    })
  }

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
  }
})
