//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi, useLogger } from '@/composables'
import { useAuthzStore } from './authz'

import cloneDeep from 'lodash/cloneDeep'

export const useShootStore = defineStore('shoot', () => {
  const api = useApi()
  const logger = useLogger()
  const authzStore = useAuthzStore()

  const list = ref(null)
  const newShootResource = ref(null)
  const initialNewShootResource = ref(null)
  const shootListFilters = ref(null)

  const isInitial = computed(() => {
    return list.value === null
  })

  function subscribe () {
    logger.debug('subscribed shoots')
  }

  function unsubscribe () {
    logger.debug('unsubscribed shoots')
  }

  function setNewShootResource (value) {
    newShootResource.value = value
  }

  function resetNewShootResource () {
    newShootResource.value = cloneDeep(initialNewShootResource.value)
  }

  function setShootListFilters (value) {
    shootListFilters.value = value
  }

  async function fetchShoots () {
    const namespace = authzStore.namespace
    try {
      const response = await api.getShoots({ namespace })
      list.value = response.data
    } catch (err) {
      $reset()
      throw err
    }
  }

  async function $reset () {
    list.value = null
  }

  return {
    list,
    newShootResource,
    shootListFilters,
    isInitial,
    fetchShoots,
    subscribe,
    unsubscribe,
    setNewShootResource,
    resetNewShootResource,
    setShootListFilters,
    $reset,
  }
})