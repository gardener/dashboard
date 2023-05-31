//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import semver from 'semver'

import { useSeedStore } from './seed'
import { useConfigStore } from './config'
import { useApi, useLogger } from '@/composables'

import {
  shortRandomString,
  parseSize,
  defaultCriNameByKubernetesVersion,
  getDateFormatted,
} from '@/utils'
import moment from '@/utils/moment'
import { v4 as uuidv4 } from '@/utils/uuid'

import filter from 'lodash/filter'
import sortBy from 'lodash/sortBy'
import uniq from 'lodash/uniq'
import map from 'lodash/map'
import get from 'lodash/get'
import some from 'lodash/some'
import intersection from 'lodash/intersection'
import find from 'lodash/find'
import difference from 'lodash/difference'
import isEqual from 'lodash/isEqual'
import toPairs from 'lodash/toPairs'
import fromPairs from 'lodash/fromPairs'
import includes from 'lodash/includes'
import lowerCase from 'lodash/lowerCase'
import isEmpty from 'lodash/isEmpty'
import flatMap from 'lodash/flatMap'
import template from 'lodash/template'
import compact from 'lodash/compact'
import head from 'lodash/head'
import max from 'lodash/max'
import cloneDeep from 'lodash/cloneDeep'
import sample from 'lodash/sample'
import pick from 'lodash/pick'

// helpers
const matchesPropertyOrEmpty = (path, srcValue) => {
  return object => {
    const objValue = get(object, path)
    if (!objValue) {
      return true
    }
    return isEqual(objValue, srcValue)
  }
}

const vendorNameFromImageName = imageName => {
  const lowerCaseName = lowerCase(imageName)
  if (lowerCaseName.includes('coreos')) {
    return 'coreos'
  } else if (lowerCaseName.includes('ubuntu')) {
    return 'ubuntu'
  } else if (lowerCaseName.includes('gardenlinux')) {
    return 'gardenlinux'
  } else if (lowerCaseName.includes('suse') && lowerCaseName.includes('jeos')) {
    return 'suse-jeos'
  } else if (lowerCaseName.includes('suse') && lowerCaseName.includes('chost')) {
    return 'suse-chost'
  } else if (lowerCaseName.includes('flatcar')) {
    return 'flatcar'
  } else if (lowerCaseName.includes('memoryone') || lowerCaseName.includes('vsmp')) {
    return 'memoryone'
  } else if (lowerCaseName.includes('aws-route53')) {
    return 'aws-route53'
  } else if (lowerCaseName.includes('azure-dns')) {
    return 'azure-dns'
  } else if (lowerCaseName.includes('azure-private-dns')) {
    return 'azure-private-dns'
  } else if (lowerCaseName.includes('google-clouddns')) {
    return 'google-clouddns'
  } else if (lowerCaseName.includes('openstack-designate')) {
    return 'openstack-designate'
  } else if (lowerCaseName.includes('alicloud-dns')) {
    return 'alicloud-dns'
  } else if (lowerCaseName.includes('cloudflare-dns')) {
    return 'cloudflare-dns'
  } else if (lowerCaseName.includes('infoblox-dns')) {
    return 'infoblox-dns'
  } else if (lowerCaseName.includes('netlify-dns')) {
    return 'netlify-dns'
  }
  return undefined
}

const findVendorHint = (vendorHints, vendorName) => {
  return find(vendorHints, hint => includes(hint.matchNames, vendorName))
}

const decorateClassificationObject = (obj) => {
  const classification = obj.classification ?? 'supported'
  const isExpired = obj.expirationDate && moment().isAfter(obj.expirationDate)
  return {
    ...obj,
    isPreview: classification === 'preview',
    isSupported: classification === 'supported' && !isExpired,
    isDeprecated: classification === 'deprecated',
    isExpired,
    expirationDateString: getDateFormatted(obj.expirationDate),
  }
}

const mapOptionForInput = (optionValue, shootResource) => {
  const key = get(optionValue, 'key')
  if (!key) {
    return
  }

  const isSelectedByDefault = false
  const inputInverted = get(optionValue, 'input.inverted', false)
  const defaultValue = inputInverted ? !isSelectedByDefault : isSelectedByDefault
  const rawValue = get(shootResource, ['metadata', 'annotations', key], `${defaultValue}`) === 'true'
  const value = inputInverted ? !rawValue : rawValue

  const option = {
    value,
  }
  return [key, option]
}

const mapAccessRestrictionForInput = (accessRestrictionDefinition, shootResource) => {
  const key = get(accessRestrictionDefinition, 'key')
  if (!key) {
    return
  }

  const isSelectedByDefault = false
  const inputInverted = get(accessRestrictionDefinition, 'input.inverted', false)
  const defaultValue = inputInverted ? !isSelectedByDefault : isSelectedByDefault
  const rawValue = get(shootResource, ['spec', 'seedSelector', 'matchLabels', key], `${defaultValue}`) === 'true'
  const value = inputInverted ? !rawValue : rawValue

  let optionsPair = map(get(accessRestrictionDefinition, 'options'), option => mapOptionForInput(option, shootResource))
  optionsPair = compact(optionsPair)
  const options = fromPairs(optionsPair)

  const accessRestriction = {
    value,
    options,
  }
  return [key, accessRestriction]
}

const mapOptionForDisplay = ({ optionDefinition, option: { value } }) => {
  const {
    key,
    display: {
      visibleIf = false,
      title = key,
      description,
    },
  } = optionDefinition

  const optionVisible = visibleIf === value
  if (!optionVisible) {
    return undefined // skip
  }

  return {
    key,
    title,
    description,
  }
}

const mapAccessRestrictionForDisplay = ({ definition, accessRestriction: { value, options } }) => {
  const {
    key,
    display: {
      visibleIf = false,
      title = key,
      description,
    },
    options: optionDefinitions,
  } = definition

  const accessRestrictionVisible = visibleIf === value
  if (!accessRestrictionVisible) {
    return undefined // skip
  }

  const optionsList = compact(map(optionDefinitions, optionDefinition => mapOptionForDisplay({ optionDefinition, option: options[optionDefinition.key] })))

  return {
    key,
    title,
    description,
    options: optionsList,
  }
}

// Return first item with classification supported, if no item has classification supported
// return first item with classifiction undefined, if no item matches these requirements,
// return first item in list
const firstItemMatchingVersionClassification = (items) => {
  let defaultItem = find(items, { classification: 'supported' })
  if (defaultItem) {
    return defaultItem
  }

  defaultItem = find(items, machineImage => {
    return machineImage.classification === undefined
  })
  if (defaultItem) {
    return defaultItem
  }

  return head(items)
}

export const useCloudProfileStore = defineStore('cloudProfile', () => {
  const seedStore = useSeedStore()
  const configStore = useConfigStore()
  const logger = useLogger()
  const api = useApi()

  const list = ref(null)

  const isInitial = computed(() => {
    return list.value === null
  })

  async function fetchCloudProfiles () {
    const response = await api.getCloudProfiles()
    list.value = response.data
  }

  function _isValidRegion (cloudProfileName, cloudProviderKind) {
    return region => {
      if (cloudProviderKind === 'azure') {
        // Azure regions may not be zoned, need to filter these out for the dashboard
        return !!zonesByCloudProfileNameAndRegion({ cloudProfileName, region }).length
      }

      // Filter regions that are not defined in cloud profile
      const cloudProfile = cloudProfileByName(cloudProfileName)
      if (cloudProfile) {
        return some(cloudProfile.data.regions, ['name', region])
      }

      return true
    }
  }

  const infrastructureKindList = computed(() => {
    return uniq(map(list.value, 'metadata.cloudProviderKind'))
  })

  const sortedInfrastructureKindList = computed(() => {
    return intersection(['aws', 'azure', 'gcp', 'openstack', 'alicloud', 'metal', 'vsphere', 'hcloud', 'onmetal', 'local'], infrastructureKindList.value)
  })

  function cloudProfilesByCloudProviderKind (cloudProviderKind) {
    const predicate = item => item.metadata.cloudProviderKind === cloudProviderKind
    const filteredCloudProfiles = filter(list.value, predicate)
    return sortBy(filteredCloudProfiles, 'metadata.name')
  }

  function cloudProfileByName (cloudProfileName) {
    return find(list.value, ['metadata.name', cloudProfileName])
  }

  function seedsByNames (seedNames) {
    return map(seedNames, seedStore.seedByName)
  }

  function seedsByCloudProfileName (cloudProfileName) {
    const cloudProfile = cloudProfileByName(cloudProfileName)
    if (!cloudProfile) {
      return []
    }
    const seedNames = cloudProfile.data.seedNames
    if (!seedNames) {
      return []
    }
    return seedsByNames(seedNames)
  }

  function zonesByCloudProfileNameAndRegion ({ cloudProfileName, region }) {
    const cloudProfile = cloudProfileByName(cloudProfileName)
    if (cloudProfile) {
      return map(get(find(cloudProfile.data.regions, { name: region }), 'zones'), 'name')
    }
    return []
  }

  function regionsWithSeedByCloudProfileName (cloudProfileName) {
    const cloudProfile = cloudProfileByName(cloudProfileName)
    if (!cloudProfile) {
      return []
    }
    const seeds = seedsByCloudProfileName(cloudProfileName)

    const uniqueSeedRegions = uniq(map(seeds, 'data.region'))
    const uniqueSeedRegionsWithZones = filter(uniqueSeedRegions, _isValidRegion(cloudProfileName, cloudProfile.metadata.cloudProviderKind))
    return uniqueSeedRegionsWithZones
  }

  function regionsWithoutSeedByCloudProfileName (cloudProfileName) {
    const cloudProfile = cloudProfileByName(cloudProfileName)
    if (cloudProfile) {
      const regionsInCloudProfile = map(cloudProfile.data.regions, 'name')
      const regionsInCloudProfileWithZones = filter(regionsInCloudProfile, _isValidRegion(cloudProfileName, cloudProfile.metadata.cloudProviderKind))
      const regionsWithoutSeed = difference(regionsInCloudProfileWithZones, regionsWithSeedByCloudProfileName(cloudProfileName))
      return regionsWithoutSeed
    }
    return []
  }

  function minimumVolumeSizeByCloudProfileNameAndRegion ({ cloudProfileName, region, secretDomain }) {
    const defaultMinimumSize = '20Gi'
    const cloudProfile = cloudProfileByName(cloudProfileName)
    if (!cloudProfile) {
      return defaultMinimumSize
    }
    const seedsForCloudProfile = cloudProfile.data.seeds
    const seedsMatchingCloudProfileAndRegion = find(seedsForCloudProfile, { data: { region } })
    return max(map(seedsMatchingCloudProfileAndRegion, 'volume.minimumSize')) || defaultMinimumSize
  }

  function floatingPoolsByCloudProfileNameAndRegionAndDomain ({ cloudProfileName, region, secretDomain }) {
    const cloudProfile = cloudProfileByName(cloudProfileName)
    const floatingPools = get(cloudProfile, 'data.providerConfig.constraints.floatingPools')
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

  function floatingPoolNamesByCloudProfileNameAndRegionAndDomain ({ cloudProfileName, region, secretDomain }) {
    return uniq(map(floatingPoolsByCloudProfileNameAndRegionAndDomain({ cloudProfileName, region, secretDomain }), 'name'))
  }

  function loadBalancerProviderNamesByCloudProfileNameAndRegion ({ cloudProfileName, region }) {
    const cloudProfile = cloudProfileByName(cloudProfileName)
    const loadBalancerProviders = get(cloudProfile, 'data.providerConfig.constraints.loadBalancerProviders')
    let availableLoadBalancerProviders = filter(loadBalancerProviders, matchesPropertyOrEmpty('region', region))
    const hasRegionSpecificLoadBalancerProvider = find(availableLoadBalancerProviders, lb => !!lb.region)
    if (hasRegionSpecificLoadBalancerProvider) {
      availableLoadBalancerProviders = filter(availableLoadBalancerProviders, { region })
    }
    return uniq(map(availableLoadBalancerProviders, 'name'))
  }

  function loadBalancerClassNamesByCloudProfileName (cloudProfileName) {
    const loadBalancerClasses = loadBalancerClassesByCloudProfileName(cloudProfileName)
    return uniq(map(loadBalancerClasses, 'name'))
  }

  function loadBalancerClassesByCloudProfileName (cloudProfileName) {
    const cloudProfile = cloudProfileByName(cloudProfileName)
    return get(cloudProfile, 'data.providerConfig.constraints.loadBalancerConfig.classes')
  }

  function partitionIDsByCloudProfileNameAndRegion ({ cloudProfileName, region }) {
    // Partion IDs equal zones for metal infrastructure
    const cloudProfile = cloudProfileByName(cloudProfileName)
    if (get(cloudProfile, 'metadata.cloudProviderKind') !== 'metal') {
      return
    }
    const partitionIDs = zonesByCloudProfileNameAndRegion({ cloudProfileName, region })
    return partitionIDs
  }

  function firewallSizesByCloudProfileNameAndRegionAndArchitecture ({ cloudProfileName, region, architecture }) {
    // Firewall Sizes equals to list of image types for this cloud provider
    const cloudProfile = cloudProfileByName(cloudProfileName)
    if (get(cloudProfile, 'metadata.cloudProviderKind') !== 'metal') {
      return
    }
    const firewallSizes = machineTypesByCloudProfileNameAndRegionAndArchitecture({ cloudProfileName, region, architecture })
    return firewallSizes
  }

  function firewallImagesByCloudProfileName (cloudProfileName) {
    const cloudProfile = cloudProfileByName(cloudProfileName)
    return get(cloudProfile, 'data.providerConfig.firewallImages')
  }

  function firewallNetworksByCloudProfileNameAndPartitionId ({ cloudProfileName, partitionID }) {
    const cloudProfile = cloudProfileByName(cloudProfileName)
    const networks = get(cloudProfile, ['data', 'providerConfig', 'firewallNetworks', partitionID])
    return map(toPairs(networks), ([key, value]) => {
      return {
        key,
        value,
        text: `${key} [${value}]`,
      }
    })
  }

  function machineTypesOrVolumeTypesByCloudProfileNameAndRegion ({ type, cloudProfileName, region }) {
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

    if (!cloudProfileName) {
      return []
    }
    const cloudProfile = cloudProfileByName(cloudProfileName)
    if (!cloudProfile) {
      return []
    }
    const items = cloudProfile.data[type]
    if (!region) {
      return items
    }
    const zones = zonesByCloudProfileNameAndRegion({ cloudProfileName, region })

    const regionObject = find(cloudProfile.data.regions, { name: region })
    let regionZones = get(regionObject, 'zones', [])
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

  // TODO: check later
  // eslint-disable-next-line no-unused-vars
  function machineTypesByCloudProfileName (cloudProfileName) {
    return machineTypesOrVolumeTypesByCloudProfileNameAndRegion({ type: 'machineTypes', cloudProfileName })
  }

  function machineTypesByCloudProfileNameAndRegionAndArchitecture ({ cloudProfileName, region, architecture }) {
    let machineTypes = machineTypesOrVolumeTypesByCloudProfileNameAndRegion({
      type: 'machineTypes',
      cloudProfileName,
      region,
    })
    machineTypes = map(machineTypes, item => {
      const machineType = { ...item }
      machineType.architecture ??= 'amd64' // default if not maintained
      return machineType
    })

    return filter(machineTypes, { architecture })
  }

  function machineArchitecturesByCloudProfileNameAndRegion ({ cloudProfileName, region }) {
    const machineTypes = machineTypesOrVolumeTypesByCloudProfileNameAndRegion({
      type: 'machineTypes',
      cloudProfileName,
      region,
    })
    const architectures = uniq(map(machineTypes, 'architecture'))
    return architectures.sort()
  }

  function volumeTypesByCloudProfileNameAndRegion ({ cloudProfileName, region }) {
    return machineTypesOrVolumeTypesByCloudProfileNameAndRegion({ type: 'volumeTypes', cloudProfileName, region })
  }

  function machineImagesByCloudProfileName (cloudProfileName) {
    const cloudProfile = cloudProfileByName(cloudProfileName)
    const machineImages = get(cloudProfile, 'data.machineImages')

    const mapMachineImages = (machineImage) => {
      const versions = filter(machineImage.versions, ({ version, expirationDate }) => {
        if (!semver.valid(version)) {
          console.error(`Skipped machine image ${machineImage.name} as version ${version} is not a valid semver version`)
          return false
        }
        return true
      })
      versions.sort((a, b) => {
        return semver.rcompare(a.version, b.version)
      })

      const name = machineImage.name
      const vendorName = vendorNameFromImageName(machineImage.name)
      const vendorHint = findVendorHint(configStore.vendorHints, vendorName)

      return map(versions, ({ version, expirationDate, cri, classification, architectures }) => {
        if (isEmpty(architectures)) {
          architectures = ['amd64'] // default if not maintained
        }
        return decorateClassificationObject({
          key: name + '/' + version,
          name,
          version,
          cri,
          classification,
          expirationDate,
          vendorName,
          icon: vendorName,
          vendorHint,
          architectures,
        })
      })
    }

    return flatMap(machineImages, mapMachineImages)
  }

  // TODO: check later
  // eslint-disable-next-line no-unused-vars
  function accessRestrictionNoItemsTextForCloudProfileNameAndRegion ({ cloudProfileName: cloudProfile, region }) {
    const noItemsText = get(configStore, 'accessRestriction.noItemsText', 'No access restriction options available for region ${region}') // eslint-disable-line no-template-curly-in-string

    const compiled = template(noItemsText)
    return compiled({
      region,
      cloudProfile,
    })
  }

  function accessRestrictionDefinitionsByCloudProfileNameAndRegion ({ cloudProfileName, region }) {
    if (!cloudProfileName) {
      return undefined
    }
    if (!region) {
      return undefined
    }

    const labels = labelsByCloudProfileNameAndRegion({ cloudProfileName, region })
    if (isEmpty(labels)) {
      return undefined
    }

    const items = get(configStore, 'accessRestriction.items')
    return filter(items, ({ key }) => {
      if (!key) {
        return false
      }
      return labels[key] === 'true'
    })
  }

  function accessRestrictionsForShootByCloudProfileNameAndRegion ({ shootResource, cloudProfileName, region }) {
    const definitions = accessRestrictionDefinitionsByCloudProfileNameAndRegion({ cloudProfileName, region })

    let accessRestrictionsMap = map(definitions, definition => mapAccessRestrictionForInput(definition, shootResource))
    accessRestrictionsMap = compact(accessRestrictionsMap)
    return fromPairs(accessRestrictionsMap)
  }

  function selectedAccessRestrictionsForShootByCloudProfileNameAndRegion ({ shootResource, cloudProfileName, region }) {
    const definitions = accessRestrictionDefinitionsByCloudProfileNameAndRegion({ cloudProfileName, region })
    const accessRestrictions = accessRestrictionsForShootByCloudProfileNameAndRegion({ shootResource, cloudProfileName, region })

    return compact(map(definitions, definition => mapAccessRestrictionForDisplay({ definition, accessRestriction: accessRestrictions[definition.key] })))
  }

  function labelsByCloudProfileNameAndRegion ({ cloudProfileName, region }) {
    const cloudProfile = cloudProfileByName(cloudProfileName)
    if (cloudProfile) {
      return get(find(cloudProfile.data.regions, { name: region }), 'labels')
    }
    return {}
  }

  function defaultMachineImageForCloudProfileNameAndMachineType (cloudProfileName, machineType) {
    const allMachineImages = machineImagesByCloudProfileName(cloudProfileName)
    const machineImages = filter(allMachineImages, ({ architectures }) => includes(architectures, machineType.architecture))
    return firstItemMatchingVersionClassification(machineImages)
  }

  function kubernetesVersions (cloudProfileName) {
    const cloudProfile = cloudProfileByName(cloudProfileName)
    const allVersions = get(cloudProfile, 'data.kubernetes.versions', [])
    const validVersions = filter(allVersions, ({ expirationDate, version }) => {
      if (!semver.valid(version)) {
        logger.error(`Skipped Kubernetes version ${version} as it is not a valid semver version`)
        return false
      }
      return true
    })
    return map(validVersions, decorateClassificationObject)
  }

  function sortedKubernetesVersions (cloudProfileName) {
    const kubernetsVersions = cloneDeep(kubernetesVersions(cloudProfileName))
    kubernetsVersions.sort((a, b) => {
      return semver.rcompare(a.version, b.version)
    })
    return kubernetsVersions
  }

  function defaultKubernetesVersionForCloudProfileName (cloudProfileName) {
    const k8sVersions = sortedKubernetesVersions(cloudProfileName)
    return firstItemMatchingVersionClassification(k8sVersions)
  }

  function generateWorker (availableZones, cloudProfileName, region, kubernetesVersion) {
    const id = uuidv4()
    const name = `worker-${shortRandomString(5)}`
    const zones = !isEmpty(availableZones) ? [sample(availableZones)] : undefined
    const architecture = head(machineArchitecturesByCloudProfileNameAndRegion({ cloudProfileName, region }))
    const machineTypesForZone = machineTypesByCloudProfileNameAndRegionAndArchitecture({ cloudProfileName, region, architecture })
    const machineType = head(machineTypesForZone) || {}
    const volumeTypesForZone = volumeTypesByCloudProfileNameAndRegion({ cloudProfileName, region })
    const volumeType = head(volumeTypesForZone) || {}
    const machineImage = defaultMachineImageForCloudProfileNameAndMachineType(cloudProfileName, machineType)
    const minVolumeSize = minimumVolumeSizeByCloudProfileNameAndRegion({ cloudProfileName, region })

    const defaultVolumeSize = parseSize(minVolumeSize) <= parseSize('50Gi') ? '50Gi' : minVolumeSize
    const worker = {
      id,
      name,
      minimum: 1,
      maximum: 2,
      maxSurge: 1,
      machine: {
        type: machineType.name,
        image: pick(machineImage, ['name', 'version']),
        architecture,
      },
      zones,
      cri: {
        name: defaultCriNameByKubernetesVersion(map(machineImage.cri, 'name'), kubernetesVersion),
      },
      isNew: true,
    }
    if (volumeType.name) {
      worker.volume = {
        type: volumeType.name,
        size: defaultVolumeSize,
      }
    } else if (!machineType.storage) {
      worker.volume = {
        size: defaultVolumeSize,
      }
    } else if (machineType.storage.type !== 'fixed') {
      worker.volume = {
        size: machineType.storage.size,
      }
    }
    return worker
  }

  return {
    list,
    isInitial,
    fetchCloudProfiles,
    cloudProfilesByCloudProviderKind,
    sortedInfrastructureKindList,
    cloudProfileByName,
    regionsWithSeedByCloudProfileName,
    regionsWithoutSeedByCloudProfileName,
    loadBalancerProviderNamesByCloudProfileNameAndRegion,
    floatingPoolNamesByCloudProfileNameAndRegionAndDomain,
    loadBalancerClassNamesByCloudProfileName,
    partitionIDsByCloudProfileNameAndRegion,
    firewallImagesByCloudProfileName,
    firewallSizesByCloudProfileNameAndRegionAndArchitecture,
    firewallNetworksByCloudProfileNameAndPartitionId,
    defaultKubernetesVersionForCloudProfileName,
    zonesByCloudProfileNameAndRegion,
    machineArchitecturesByCloudProfileNameAndRegion,
    machineTypesByCloudProfileNameAndRegionAndArchitecture,
    volumeTypesByCloudProfileNameAndRegion,
    defaultMachineImageForCloudProfileNameAndMachineType,
    minimumVolumeSizeByCloudProfileNameAndRegion,
    selectedAccessRestrictionsForShootByCloudProfileNameAndRegion,
    generateWorker,
  }
})
