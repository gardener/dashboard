//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { grey } from 'vuetify/lib/util/colors'

import { useShootStore } from '@/store/shoot'
import { useSocketStore } from '@/store/socket'
import { constants } from '@/store/shoot/helper'

export function useShootSubscription (options = {}) {
  const {
    shootStore = useShootStore(),
    socketStore = useSocketStore(),
  } = options

  const {
    subscriptionState,
    subscriptionError,
    loading,
    subscription,
    subscribed,
    unsubscribed,
  } = storeToRefs(shootStore)

  const {
    readyState,
    connected,
    active,
  } = storeToRefs(socketStore)

  const kind = computed(() => {
    if (subscriptionState.value === constants.LOADING) {
      return subscriptionError.value
        ? 'alert-load'
        : 'progress-load'
    }
    if (subscriptionState.value === constants.LOADED || subscriptionState.value === constants.OPENING) {
      return subscriptionError.value
        ? 'alert-subscribe'
        : 'progress-subscribe'
    }
    if (!connected.value) {
      return active.value
        ? 'progress-connect'
        : 'alert-connect'
    }
    return 'ok'
  })
  const color = computed(() => {
    switch (kind.value) {
      case 'alert-connect':
      case 'alert-load':
      case 'alert-subscribe':
        return 'error'
      case 'progress-connect':
        return grey.darken1
      case 'progress-load':
      case 'progress-subscribe':
      default:
        return 'primary'
    }
  })
  const message = computed(() => {
    const name = subscription.value?.name
      ? 'shoot'
      : 'shoots'
    switch (kind.value) {
      case 'alert-connect':
        return 'Establishing real-time server connection failed'
      case 'alert-load':
        return `Loading ${name} failed. Data may be outdated`
      case 'alert-subscribe':
        return `Subscribing ${name} failed. Data may be outdated`
      case 'progress-connect':
        return 'Establishing real-time server connection ...'
      case 'progress-load':
        return `Loading ${name} ...`
      case 'progress-subscribe':
        return `Subscribing ${name} ...`
      default:
        return subscribed.value
          ? `Successfully loaded and subscribed ${name}`
          : 'Real-time server connected'
    }
  })
  const hint = computed(() => {
    return kind.value.startsWith('alert')
      ? `Pressing the ${action.value.toUpperCase()} button may fix the problem`
      : ''
  })
  const action = computed(() => {
    switch (kind.value) {
      case 'alert-connect':
        return 'reconnect'
      case 'alert-subscribe':
        return 'retry'
      case 'alert-load':
        return 'reload'
      default:
        return ''
    }
  })

  function retry () {
    if (!connected.value && !active.value) {
      socketStore.connect()
    } else {
      shootStore.synchronize()
    }
  }

  return {
    subscriptionState,
    subscriptionError,
    loading,
    subscription,
    subscribed,
    unsubscribed,
    readyState,
    connected,
    active,
    kind,
    color,
    message,
    hint,
    action,
    retry,
  }
}
