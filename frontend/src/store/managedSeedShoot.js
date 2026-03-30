//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
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

import { useApi } from '@/composables/useApi'
import { useLogger } from '@/composables/useLogger'
import { useSocketEventHandler } from '@/composables/useSocketEventHandler'

import find from 'lodash/find'

export const useManagedSeedShootStore = defineStore('managedseed-shoot', () => {
  const api = useApi()
  const logger = useLogger()

  const list = ref(null)

  const isInitial = computed(() => {
    return list.value === null
  })

  const managedSeedShootList = computed(() => {
    return list.value
  })

  async function fetchManagedSeedShoots () {
    const response = await api.getManagedSeedShootsForGardenNamespace()
    list.value = response.data
  }

  function shootByName (namespace, name) {
    return find(list.value, { metadata: { namespace, name } })
  }

  const socketEventHandler = useSocketEventHandler(useManagedSeedShootStore, {
    logger,
  })
  socketEventHandler.start(500)

  return {
    list,
    isInitial,
    managedSeedShootList,
    fetchManagedSeedShoots,
    shootByName,
    handleEvent: socketEventHandler.listener,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useManagedSeedShootStore, import.meta.hot))
}
