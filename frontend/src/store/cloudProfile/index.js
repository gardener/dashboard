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

import { useApi } from '@/composables/useApi'
import { useCloudProfileForRegions } from '@/composables/useCloudProfile/useCloudProfileForRegions'

import filter from 'lodash/filter'
import sortBy from 'lodash/sortBy'
import uniq from 'lodash/uniq'
import map from 'lodash/map'
import get from 'lodash/get'
import intersection from 'lodash/intersection'
import find from 'lodash/find'
import includes from 'lodash/includes'

export const useCloudProfileStore = defineStore('cloudProfile', () => {
  const api = useApi()

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

  const knownProviderTypesList = ref([
    'aws',
    'azure',
    'gcp',
    'openstack',
    'alicloud',
    'metal',
    'vsphere',
    'hcloud',
    'onmetal',
    'ironcore',
    'stackit',
    'local',
  ])

  const providerTypesList = computed(() => {
    return uniq(map(list.value, 'spec.type'))
  })

  const sortedProviderTypeList = computed(() => {
    return intersection(knownProviderTypesList.value, providerTypesList.value)
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

  function minimumVolumeSizeByMachineTypeAndVolumeType ({ machineType, volumeType }) {
    if (volumeType?.name) {
      return volumeType.minSize ?? '0Gi'
    }

    if (machineType?.storage) {
      return machineType.storage.minSize ?? '0Gi'
    }

    return '0Gi'
  }

  function machineTypesOrVolumeTypesByCloudProfileRefAndRegion ({ type, cloudProfileRef, region }) {
    const machineAndVolumeTypePredicate = unavailableItems => {
      return item => {
        if (item.usable === false) {
          return false
        }
        return !includes(unavailableItems, item.name)
      }
    }

    if (!cloudProfileRef) {
      return []
    }
    const cloudProfile = cloudProfileByRef(cloudProfileRef)
    if (!cloudProfile) {
      return []
    }
    const items = get(cloudProfile.spec, [type])
    if (!region) {
      return items
    }
    const cloudProfileValue = computed(() => cloudProfile)
    const regionRef = computed(() => region)
    const { zonesByRegion } = useCloudProfileForRegions(cloudProfileValue)
    const zones = zonesByRegion(regionRef).value

    const regionObject = find(cloudProfile.spec.regions, { name: region })
    let regionZones = get(regionObject, ['zones'], [])
    regionZones = filter(regionZones, regionZone => includes(zones, regionZone.name))
    const unavailableItems = map(regionZones, zone => {
      if (type === 'machineTypes') {
        return zone.unavailableMachineTypes
      } else if (type === 'volumeTypes') {
        return zone.unavailableVolumeTypes
      }
    })
    const unavailableItemsInAllZones = intersection(...unavailableItems)

    return filter(items, machineAndVolumeTypePredicate(unavailableItemsInAllZones))
  }

  function volumeTypesByCloudProfileRefAndRegion ({ cloudProfileRef, region }) {
    return machineTypesOrVolumeTypesByCloudProfileRefAndRegion({ type: 'volumeTypes', cloudProfileRef, region })
  }

  function volumeTypesByCloudProfileRef (cloudProfileRef) {
    return volumeTypesByCloudProfileRefAndRegion({ cloudProfileRef, region: undefined })
  }

  return {
    list,
    isInitial,
    cloudProfileList,
    setCloudProfiles,
    fetchCloudProfiles,
    cloudProfilesByProviderType,
    sortedProviderTypeList,
    cloudProfileByRef,
    // Volume Stuff
    volumeTypesByCloudProfileRefAndRegion,
    volumeTypesByCloudProfileRef,
    minimumVolumeSizeByMachineTypeAndVolumeType,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCloudProfileStore, import.meta.hot))
}
