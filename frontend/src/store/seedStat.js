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
  watch,
} from 'vue'

import { useAppStore } from '@/store/app'
import { useSocketStore } from '@/store/socket'

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
  const refreshNonce = ref(0)
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
    const data = options.name
      ? [response.data]
      : response.data
    return data
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

  watch(
    [subscription, refreshNonce],
    async ([newSub], [oldSub], onCleanup) => {
      let cancelled = false
      onCleanup(() => {
        cancelled = true
      })

      const subChanged = !isEqual(newSub, oldSub)
      if (subChanged && oldSub) {
        await closeSubscription()
        if (cancelled) {
          return
        }
      }

      if (!newSub) {
        list.value = null
        subscribed.value = false
        return
      }

      try {
        const data = await fetchSeedStats(newSub)
        if (cancelled) {
          return
        }
        list.value = data
        await openSubscription(newSub)
      } catch (err) {
        if (!cancelled) {
          appStore.setError(err)
        }
      }
    },
    { deep: true },
  )

  function subscribe (options = {}) {
    subscription.value = options
  }

  function unsubscribe () {
    subscription.value = null
  }

  function synchronize () {
    if (!subscription.value) {
      return
    }
    refreshNonce.value++
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
