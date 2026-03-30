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

import { useApi } from '@/composables/useApi'
import { useLogger } from '@/composables/useLogger'
import { useSocketEventHandler } from '@/composables/useSocketEventHandler'

import find from 'lodash/find'
import get from 'lodash/get'

export const useManagedSeedStore = defineStore('managedseed', () => {
  const api = useApi()
  const logger = useLogger()

  const list = ref(null)

  const isInitial = computed(() => {
    return list.value === null
  })

  const managedSeedList = computed(() => {
    return list.value
  })

  async function fetchManagedSeeds () {
    const response = await api.getManagedSeedsForGardenNamespace()
    list.value = response.data
  }

  function managedSeedByName (name) {
    return find(list.value, ['metadata.name', name])
  }

  function shootNameForSeed (seedName) {
    const managedSeed = managedSeedByName(seedName)
    return get(managedSeed, ['spec', 'shoot', 'name'])
  }

  const socketEventHandler = useSocketEventHandler(useManagedSeedStore, {
    logger,
  })
  socketEventHandler.start(500)

  return {
    list,
    isInitial,
    managedSeedList,
    fetchManagedSeeds,
    managedSeedByName,
    shootNameForSeed,
    handleEvent: socketEventHandler.listener,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useManagedSeedStore, import.meta.hot))
}
