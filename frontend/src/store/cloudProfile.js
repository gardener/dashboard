//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi } from '@/composables'
import filter from 'lodash/filter'
import sortBy from 'lodash/sortBy'
import uniq from 'lodash/uniq'
import map from 'lodash/map'
import intersection from 'lodash/intersection'
import find from 'lodash/find'

export const useCloudprofileStore = defineStore('cloudprofile', () => {
  const api = useApi()

  const list = ref(null)

  const isInitial = computed(() => {
    return list.value === null
  })

  async function fetchCloudprofiles () {
    const response = await api.getCloudprofiles()
    list.value = response.data
  }

  function cloudProfilesByCloudProviderKind (cloudProviderKind) {
    const predicate = item => item.metadata.cloudProviderKind === cloudProviderKind
    const filteredCloudProfiles = filter(list.value, predicate)
    return sortBy(filteredCloudProfiles, 'metadata.name')
  }

  const infrastructureKindList = computed(() => {
    return uniq(map(list.value, 'metadata.cloudProviderKind'))
  })

  const sortedInfrastructureKindList = computed(() => {
    return intersection(['aws', 'azure', 'gcp', 'openstack', 'alicloud', 'metal', 'vsphere', 'hcloud', 'onmetal', 'local'], infrastructureKindList.value)
  })

  function cloudProfileByName (name) {
    return find(list.value, ['metadata.name', name])
  }

  return {
    list,
    isInitial,
    fetchCloudprofiles,
    cloudProfilesByCloudProviderKind,
    sortedInfrastructureKindList,
    cloudProfileByName,
  }
})
