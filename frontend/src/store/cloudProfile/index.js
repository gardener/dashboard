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
  ref,
  computed,
} from 'vue'

import { useConfigStore } from '@/store/config'

import { useApi } from '@/composables/useApi'

import filter from 'lodash/filter'
import sortBy from 'lodash/sortBy'
import uniq from 'lodash/uniq'
import map from 'lodash/map'
import find from 'lodash/find'

export const useCloudProfileStore = defineStore('cloudProfile', () => {
  const api = useApi()

  const configStore = useConfigStore()

  const list = ref(null)

  const isInitial = computed(() => {
    return list.value === null
  })

  const cloudProfileList = computed(() => {
    return list.value
  })

  async function fetchCloudProfiles () {
    const response = await api.getCloudProfiles()
    setCloudProfiles(response.data)
  }

  function setCloudProfiles (cloudProfiles) {
    list.value = cloudProfiles
  }

  const infraProviderTypesList = computed(() => {
    return uniq(map(list.value, 'spec.type'))
  })

  const sortedInfraProviderTypeList = computed(() => {
    const infraProviderVendors = map(infraProviderTypesList.value, configStore.vendorDetails)
    const sortedVisibleInfraVendors = sortBy(infraProviderVendors, 'weight')
    return map(sortedVisibleInfraVendors, 'name')
  })

  function cloudProfilesByProviderType (providerType) {
    const predicate = item => item.spec.type === providerType
    const filteredCloudProfiles = filter(list.value, predicate)
    return sortBy(filteredCloudProfiles, 'metadata.name')
  }

  function cloudProfileByRef (cloudProfileRef) {
    if (cloudProfileRef?.kind !== 'CloudProfile') {
      return null
    }
    return find(list.value, ['metadata.name', cloudProfileRef?.name])
  }

  return {
    list,
    isInitial,
    cloudProfileList,
    setCloudProfiles,
    fetchCloudProfiles,
    cloudProfilesByProviderType,
    sortedInfraProviderTypeList,
    cloudProfileByRef,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCloudProfileStore, import.meta.hot))
}
