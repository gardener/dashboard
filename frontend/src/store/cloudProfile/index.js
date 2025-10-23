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
import { useCloudProfileForMachineTypes } from '@/composables/useCloudProfile/useCloudProfileForMachineTypes'
import { useCloudProfileForMachineImages } from '@/composables/useCloudProfile/useCloudProfileForMachineImages'
import { useCloudProfileForRegions } from '@/composables/useCloudProfile/useCloudProfileForRegions'

import {
  shortRandomString,
  convertToGi,
  defaultCriNameByKubernetesVersion,
} from '@/utils'
import { v4 as uuidv4 } from '@/utils/uuid'

import { useConfigStore } from '../config'

import { matchesPropertyOrEmpty } from './helper'

import filter from 'lodash/filter'
import sortBy from 'lodash/sortBy'
import uniq from 'lodash/uniq'
import map from 'lodash/map'
import get from 'lodash/get'
import intersection from 'lodash/intersection'
import find from 'lodash/find'
import toPairs from 'lodash/toPairs'
import includes from 'lodash/includes'
import isEmpty from 'lodash/isEmpty'
import template from 'lodash/template'
import head from 'lodash/head'
import sample from 'lodash/sample'
import pick from 'lodash/pick'

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

  function floatingPoolsByCloudProfileRefAndRegionAndDomain ({ cloudProfileRef, region, secretDomain }) {
    const cloudProfile = cloudProfileByRef(cloudProfileRef)
    const floatingPools = get(cloudProfile, ['spec', 'providerConfig', 'constraints', 'floatingPools'])
    let availableFloatingPools = filter(floatingPools, matchesPropertyOrEmpty('region', region))
    availableFloatingPools = filter(availableFloatingPools, matchesPropertyOrEmpty('domain', secretDomain))

    const hasRegionSpecificFloatingPool = find(availableFloatingPools, fp => !!fp.region && !fp.nonConstraining)
    if (hasRegionSpecificFloatingPool) {
      availableFloatingPools = filter(availableFloatingPools, { region })
    }
    const hasDomainSpecificFloatingPool = find(availableFloatingPools, fp => !!fp.domain && !fp.nonConstraining)
    if (hasDomainSpecificFloatingPool) {
      availableFloatingPools = filter(availableFloatingPools, { domain: secretDomain })
    }

    return availableFloatingPools
  }

  function floatingPoolNamesByCloudProfileRefAndRegionAndDomain ({ cloudProfileRef, region, secretDomain }) {
    return uniq(map(floatingPoolsByCloudProfileRefAndRegionAndDomain({ cloudProfileRef, region, secretDomain }), 'name'))
  }

  function loadBalancerProviderNamesByCloudProfileRefAndRegion ({ cloudProfileRef, region }) {
    const cloudProfile = cloudProfileByRef(cloudProfileRef)
    const loadBalancerProviders = get(cloudProfile, ['spec', 'providerConfig', 'constraints', 'loadBalancerProviders'])
    let availableLoadBalancerProviders = filter(loadBalancerProviders, matchesPropertyOrEmpty('region', region))
    const hasRegionSpecificLoadBalancerProvider = find(availableLoadBalancerProviders, lb => !!lb.region)
    if (hasRegionSpecificLoadBalancerProvider) {
      availableLoadBalancerProviders = filter(availableLoadBalancerProviders, { region })
    }
    return uniq(map(availableLoadBalancerProviders, 'name'))
  }

  function loadBalancerClassNamesByCloudProfileRef (cloudProfileRef) {
    const loadBalancerClasses = loadBalancerClassesByCloudProfileRef(cloudProfileRef)
    return uniq(map(loadBalancerClasses, 'name'))
  }

  function loadBalancerClassesByCloudProfileRef (cloudProfileRef) {
    const cloudProfile = cloudProfileByRef(cloudProfileRef)
    return get(cloudProfile, ['spec', 'providerConfig', 'constraints', 'loadBalancerConfig', 'classes'])
  }

  function partitionIDsByCloudProfileRefAndRegion ({ cloudProfileRef, region }) {
    // Partion IDs equal zones for metal infrastructure
    const cloudProfile = cloudProfileByRef(cloudProfileRef)
    if (get(cloudProfile, ['spec', 'type']) !== 'metal') {
      return
    }
    const cloudProfileValue = computed(() => cloudProfile)
    const regionRef = computed(() => region)
    const { zonesByRegion } = useCloudProfileForRegions(cloudProfileValue)
    const partitionIDs = zonesByRegion(regionRef).value
    return partitionIDs
  }

  function firewallSizesByCloudProfileRefAndRegion ({ cloudProfileRef, region }) {
    const cloudProfile = cloudProfileByRef(cloudProfileRef)
    if (get(cloudProfile, ['spec', 'type']) !== 'metal') {
      return
    }
    // Firewall Sizes equals to list of machine types for this cloud provider
    const cloudProfileValue = computed(() => cloudProfile)
    const { zonesByRegion } = useCloudProfileForRegions(cloudProfileValue)
    const { machineTypesByRegionAndArchitecture } = useCloudProfileForMachineTypes(cloudProfileValue, zonesByRegion)
    const regionRef = computed(() => region)
    const architectureRef = computed(() => undefined)
    const firewallSizes = machineTypesByRegionAndArchitecture(regionRef, architectureRef).value
    return firewallSizes
  }

  function firewallImagesByCloudProfileRef (cloudProfileRef) {
    const cloudProfile = cloudProfileByRef(cloudProfileRef)
    return get(cloudProfile, ['spec', 'providerConfig', 'firewallImages'])
  }

  function firewallNetworksByCloudProfileRefAndPartitionId ({ cloudProfileRef, partitionID }) {
    const cloudProfile = cloudProfileByRef(cloudProfileRef)
    const networks = get(cloudProfile, ['spec', 'providerConfig', 'firewallNetworks', partitionID])
    return map(toPairs(networks), ([key, value]) => {
      return {
        key,
        value,
        text: `${key} [${value}]`,
      }
    })
  }

  function machineTypesOrVolumeTypesByCloudProfileRefAndRegion ({ type, cloudProfileRef, region }) {
    const machineAndVolumeTypePredicate = unavailableItems => {
      return item => {
        if (item.usable === false) {
          return false
        }
        if (includes(unavailableItems, item.name)) {
          return false
        }
        return true
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

  function accessRestrictionNoItemsTextForCloudProfileRefAndRegion ({ cloudProfileRef, region }) {
    const defaultNoItemsText = 'No access restriction options available for region ${region}' // eslint-disable-line no-template-curly-in-string
    const noItemsText = get(configStore, ['accessRestriction', 'noItemsText'], defaultNoItemsText)

    return template(noItemsText)({
      region,
      cloudProfileName: cloudProfileRef?.name,
      cloudProfileKind: cloudProfileRef?.kind,
      cloudProfile: cloudProfileRef?.name, // deprecated
    })
  }

  function accessRestrictionDefinitionsByCloudProfileRefAndRegion ({ cloudProfileRef, region }) {
    if (!cloudProfileRef || !region) {
      return []
    }

    const allowedAccessRestrictions = accessRestrictionsByCloudProfileRefAndRegion({ cloudProfileRef, region })
    if (isEmpty(allowedAccessRestrictions)) {
      return []
    }

    const allowedAccessRestrictionNames = allowedAccessRestrictions.map(ar => ar.name)

    const items = get(configStore, ['accessRestriction', 'items'])
    return filter(items, ({ key }) => {
      return key && allowedAccessRestrictionNames.includes(key)
    })
  }

  function accessRestrictionsByCloudProfileRefAndRegion ({ cloudProfileRef, region }) {
    const cloudProfile = cloudProfileByRef(cloudProfileRef)
    if (!cloudProfile) {
      return []
    }
    const regionData = find(cloudProfile.spec.regions, [['name'], region])
    if (!regionData) {
      return []
    }
    return get(regionData, ['accessRestrictions'], [])
  }

  return {
    list,
    isInitial,
    cloudProfileList,
    loadBalancerClassesByCloudProfileRef,
    setCloudProfiles,
    fetchCloudProfiles,
    cloudProfilesByProviderType,
    sortedProviderTypeList,
    cloudProfileByRef,
    loadBalancerProviderNamesByCloudProfileRefAndRegion,
    floatingPoolNamesByCloudProfileRefAndRegionAndDomain,
    floatingPoolsByCloudProfileRefAndRegionAndDomain,
    loadBalancerClassNamesByCloudProfileRef,
    partitionIDsByCloudProfileRefAndRegion,
    firewallImagesByCloudProfileRef,
    firewallSizesByCloudProfileRefAndRegion,
    firewallNetworksByCloudProfileRefAndPartitionId,
    // Volum Stuff
    volumeTypesByCloudProfileRefAndRegion,
    volumeTypesByCloudProfileRef,
    minimumVolumeSizeByMachineTypeAndVolumeType,
    // Access Restrictions
    accessRestrictionsByCloudProfileRefAndRegion,
    accessRestrictionDefinitionsByCloudProfileRefAndRegion,
    accessRestrictionNoItemsTextForCloudProfileRefAndRegion,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCloudProfileStore, import.meta.hot))
}
