//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import { useLogger } from '@/composables'

export const useSocketStore = defineStore('socket', () => {
  const logger = useLogger()

  const id = ref(null)
  const readyState = ref('closed')
  const connected = ref(false)
  const active = ref(false)
  const backoff = ref({
    min: 1000,
    max: 5000,
    factor: 2,
    jitter: 0.5,
    attempts: 0,
  })
  const reason = ref(null)
  const error = ref(null)

  const isActive = computed(() => {
    return active.value || backoff.value.attempts > 0
  })

  const backoffDuration = computed(() => {
    const { min, max, factor, jitter, attempts } = backoff.value
    const duration = min * Math.pow(factor, attempts)
    const rand = Math.random()
    const sign = Math.sign(rand - 0.5)
    const deviation = Math.floor(rand * jitter * duration)
    return Math.min(duration + sign * deviation, max)
  })

  function setId (value) {
    id.value = value
  }

  function setReadyState (value) {
    readyState.value = value
  }

  function setActive (value) {
    active.value = value
  }

  function setConnected (value) {
    if (value) {
      resetBackoffAttempts()
      reason.value = null
      error.value = null
    }
    connected.value = value
  }

  function setReason (value) {
    reason.value = value
  }

  function setError (value) {
    error.value = value
  }

  function onConnect (socket) {
    setId(socket.id)
    setActive(socket.active)
    setConnected(socket.connected)
  }

  function onDisconnect (socket, reason) {
    setActive(socket.active)
    setConnected(socket.connected)
    setReason(reason)
  }

  function onError (socket, err) {
    setActive(socket.active)
    setConnected(socket.connected)
    setError(err)
  }

  function resetBackoffAttempts () {
    backoff.value.attempts = 0
  }

  const backoffAttempts = computed(() => {
    return backoff.value.attempts
  })

  function increaseBackoffAttempts () {
    backoff.value.attempts++
  }

  // mutations
  function CONNECT () {
    // only used to trigger `socket.connect()`
    logger.debug('socket will connect soon')
  }

  return {
    id,
    readyState,
    connected,
    active: isActive,
    reason,
    error,
    backoffDuration,
    onConnect,
    onDisconnect,
    onError,
    setReadyState,
    resetBackoffAttempts,
    backoffAttempts,
    increaseBackoffAttempts,
    // mutations
    CONNECT,
  }
})
