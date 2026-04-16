//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineStore,
  acceptHMRUpdate,
} from 'pinia'
import {
  ref,
  computed,
} from 'vue'

import { useAppStore } from '@/store/app'
import { useSocketStore } from '@/store/socket'
import { createSynchronizeLock } from '@/store/helper'

import { useApi } from '@/composables/useApi'
import { useLogger } from '@/composables/useLogger'
import { useShootListFilters } from '@/composables/useShootListFilters'
import { useSocketEventHandler } from '@/composables/useSocketEventHandler'

import find from 'lodash/find'
import isEqual from 'lodash/isEqual'

export const useSeedStatStore = defineStore('seedstat', () => {
  const api = useApi()
  const logger = useLogger()
  const appStore = useAppStore()
  const socketStore = useSocketStore()
  const {
    unhealthyFilterMask: currentUnhealthyFilterMask,
  } = useShootListFilters()

  const list = ref(null)
  const subscription = ref(null)

  const synchronizeLock = createSynchronizeLock('seedstat')
  const subscribed = ref(false)

  const isInitial = computed(() => {
    return list.value === null
  })

  const synchronizeOptions = computed(() => {
    if (!subscription.value) {
      return undefined
    }

    return {
      unhealthyFilterMask: subscription.value.unhealthyFilterMask,
    }
  })

  async function fetchSeedStats (options = {}) {
    const response = options.name
      ? await api.getSeedStat(options)
      : await api.getSeedStats(options)
    list.value = options.name
      ? [response.data]
      : response.data
    return list.value
  }

  async function openSubscription (options) {
    if (!socketStore.connected) {
      subscribed.value = false
      return
    }

    await socketStore.emitSubscribe('seedstats', options)
    subscribed.value = true
  }

  async function closeSubscription () {
    await socketStore.emitUnsubscribe('seedstats')
    subscribed.value = false
  }

  async function subscribe (options = {}) {
    const sameSubscription = isEqual(subscription.value, options)
    if (sameSubscription && list.value !== null) {
      if (!subscribed.value && socketStore.connected) {
        await openSubscription(options)
      }
      return
    }

    if (subscribed.value || subscription.value) {
      await closeSubscription()
    }

    subscription.value = options
    await fetchSeedStats(options)
    await openSubscription(options)
  }

  async function unsubscribe () {
    if (subscribed.value || subscription.value) {
      await closeSubscription()
    }
    subscription.value = null
    list.value = null
  }

  async function synchronize () {
    if (!subscription.value) {
      return
    }
    if (!synchronizeLock.acquire(subscription.value)) {
      return
    }
    try {
      await fetchSeedStats(subscription.value)
      await openSubscription(subscription.value)
    } catch (err) {
      appStore.setError(err)
    } finally {
      synchronizeLock.release()
    }
  }

  function statByName (name) {
    return find(list.value, ['metadata.name', name])
  }

  function shootCountForSeed (name) {
    return statByName(name)?.counts?.shootCount
  }

  function unhealthyShootsForSeed (name) {
    const unhealthyShoots = statByName(name)?.counts?.unhealthyShoots

    return unhealthyShoots?.matching
  }

  const socketEventHandler = useSocketEventHandler(useSeedStatStore, {
    logger,
    getSynchronizeOptions (store) {
      return store.synchronizeOptions
    },
  })
  socketEventHandler.start(500)

  return {
    list,
    subscription,
    currentUnhealthyFilterMask,
    synchronizeOptions,
    isInitial,
    subscribe,
    unsubscribe,
    synchronize,
    statByName,
    shootCountForSeed,
    unhealthyShootsForSeed,
    handleEvent: socketEventHandler.listener,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSeedStatStore, import.meta.hot))
}
