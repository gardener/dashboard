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
import semver from 'semver'

import { useLogger } from '@/composables/useLogger'
import { useApi } from '@/composables/useApi'

import {
  shortRandomString,
  parseSize,
  defaultCriNameByKubernetesVersion,
  isValidTerminationDate,
  selectedImageIsNotLatest,
  UNKNOWN_EXPIRED_TIMESTAMP,
  normalizeVersion,
} from '@/utils'
import { v4 as uuidv4 } from '@/utils/uuid'

import { useConfigStore } from '../config'
import { useSeedStore } from '../seed'

import {
  matchesPropertyOrEmpty,
  vendorNameFromImageName,
  findVendorHint,
  decorateClassificationObject,
  firstItemMatchingVersionClassification,
  mapAccessRestrictionForInput,
  mapAccessRestrictionForDisplay,
} from './helper'

import {
  filter,
  sortBy,
  uniq,
  map,
  get,
  some,
  intersection,
  find,
  difference,
  toPairs,
  fromPairs,
  includes,
  isEmpty,
  flatMap,
  template,
  compact,
  head,
  cloneDeep,
  sample,
  pick,
} from '@/lodash'

export const useCloudProfileStore = defineStore('cloudProfile', () => {
  const logger = useLogger()
  const api = useApi()
  const seedStore = useSeedStore()
  const configStore = useConfigStore()

  const availableKubernetesUpdatesCache = new Map()

  const list = ref(null)

  const isInitial = computed(() => {
    return list.value === null
  })

  const cloudProfileList = computed(() => {
    return list.value
  })

  async function fetchCloudProfiles () {
    const response = await api.getCloudProfiles()
    list.value = response.data
  }

  function isValidRegion (cloudProfile) {
    const cloudProfileName = cloudProfile.metadata.name
    const cloudProviderKind = cloudProfile.metadata.cloudProviderKind
    return region => {
      if (cloudProviderKind === 'azure') {
        // Azure regions may not be zoned, need to filter these out for the dashboard
        return !!zonesByCloudProfileNameAndRegion({ cloudProfileName, region }).length
      }

      // Filter regions that are not defined in cloud profile
      return some(cloudProfile.data.regions, ['name', region])
    }
  }

  const infrastructureKindList = computed(() => {
    return uniq(map(list.value, 'metadata.cloudProviderKind'))
  })

  const sortedInfrastructureKindList = computed(() => {
    return intersection(['aws', 'azure', 'gcp', 'openstack', 'alicloud', 'metal', 'vsphere', 'hcloud', 'onmetal', 'ironcore', 'local'], infrastructureKindList.value)
  })

  function cloudProfilesByCloudProviderKind (cloudProviderKind) {
    const predicate = item => item.metadata.cloudProviderKind === cloudProviderKind
    const filteredCloudProfiles = filter(list.value, predicate)
    return sortBy(filteredCloudProfiles, 'metadata.name')
  }

  function cloudProfileByName (cloudProfileName) {
    return find(list.value, ['metadata.name', cloudProfileName])
  }

  function seedsByCloudProfileName (cloudProfileName) {
    const cloudProfile = cloudProfileByName(cloudProfileName)
    return seedStore.seedsForCloudProfile(cloudProfile)
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
    const uniqueSeedRegionsWithZones = filter(uniqueSeedRegions, isValidRegion(cloudProfile))
    return uniqueSeedRegionsWithZones
  }

  function regionsWithoutSeedByCloudProfileName (cloudProfileName) {
    const cloudProfile = cloudProfileByName(cloudProfileName)
    if (cloudProfile) {
      const regionsInCloudProfile = map(cloudProfile.data.regions, 'name')
      const regionsInCloudProfileWithZones = filter(regionsInCloudProfile, isValidRegion(cloudProfile))
      const regionsWithoutSeed = difference(regionsInCloudProfileWithZones, regionsWithSeedByCloudProfileName(cloudProfileName))
      return regionsWithoutSeed
    }
    return []
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

  function getDefaultNodesCIDR ({ cloudProfileName }) {
    const cloudProfile = cloudProfileByName(cloudProfileName)
    return get(cloudProfile, 'data.providerConfig.defaultNodesCIDR', configStore.defaultNodesCIDR)
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

  function firewallSizesByCloudProfileNameAndRegion ({ cloudProfileName, region, architecture }) {
    const cloudProfile = cloudProfileByName(cloudProfileName)
    if (get(cloudProfile, 'metadata.cloudProviderKind') !== 'metal') {
      return
    }
    // Firewall Sizes equals to list of machine types for this cloud provider
    const firewallSizes = machineTypesByCloudProfileNameAndRegionAndArchitecture({ cloudProfileName, region, architecture: undefined })
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

  function machineTypesByCloudProfileName ({ cloudProfileName }) {
    return machineTypesOrVolumeTypesByCloudProfileNameAndRegion({ type: 'machineTypes', cloudProfileName })
  }

  function expirationWarningSeverityForVersion ({ isExpirationWarning, autoPatchEnabled, updateAvailable, autoUpdateAvailable }) {
    if (isExpirationWarning) {
      if (!updateAvailable) {
        return 'error'
      } else if ((!autoPatchEnabled && autoUpdateAvailable) || !autoUpdateAvailable) {
        return 'warning'
      } else {
        return 'info'
      }
    } else if (autoPatchEnabled && autoUpdateAvailable) {
      return 'info'
    }
  }

  function expiringWorkerGroupsForShoot (shootWorkerGroups, shootCloudProfileName, imageAutoPatch) {
    const allMachineImages = machineImagesByCloudProfileName(shootCloudProfileName)
    const workerGroups = map(shootWorkerGroups, worker => {
      const workerImage = get(worker, 'machine.image', {})
      const { name, version } = workerImage
      const workerImageDetails = find(allMachineImages, { name, version })
      if (!workerImageDetails) {
        return {
          ...workerImage,
          expirationDate: UNKNOWN_EXPIRED_TIMESTAMP,
          workerName: worker.name,
          isValidTerminationDate: false,
          severity: 'warning',
        }
      }

      const updateAvailable = selectedImageIsNotLatest(workerImageDetails, allMachineImages)
      const severity = expirationWarningSeverityForVersion({
        isExpirationWarning: workerImageDetails.isExpirationWarning,
        autoPatchEnabled: imageAutoPatch,
        updateAvailable,
        autoUpdateAvailable: updateAvailable,
      })

      return {
        ...workerImageDetails,
        isValidTerminationDate: isValidTerminationDate(workerImageDetails.expirationDate),
        workerName: worker.name,
        severity,
      }
    })
    return filter(workerGroups, 'severity')
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

    if (architecture) {
      return filter(machineTypes, { architecture })
    }

    return machineTypes
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

  function volumeTypesByCloudProfileName ({ cloudProfileName }) {
    return volumeTypesByCloudProfileNameAndRegion({ cloudProfileName })
  }

  function machineImagesByCloudProfileName (cloudProfileName) {
    const cloudProfile = cloudProfileByName(cloudProfileName)
    const machineImages = get(cloudProfile, 'data.machineImages')
    const mapMachineImages = machineImage => {
      const versions = []
      for (const versionObj of machineImage.versions) {
        if (semver.valid(versionObj.version)) {
          versions.push(versionObj)
          continue
        }

        const normalizedVersion = normalizeVersion(versionObj.version)
        if (normalizedVersion) {
          versionObj.version = normalizedVersion
          versions.push(versionObj)
          continue
        }

        logger.error(`Skipped machine image ${machineImage.name} as version ${versionObj.version} is not a valid semver version and cannot be normalized`)
      }
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

  function availableKubernetesUpdatesForShoot (shootVersion, cloudProfileName) {
    const key = `${shootVersion}_${cloudProfileName}`
    let newerVersions = availableKubernetesUpdatesCache.get(key)
    if (newerVersions !== undefined) {
      return newerVersions
    }
    newerVersions = {}
    const allVersions = kubernetesVersions(cloudProfileName)

    const validVersions = filter(allVersions, ({ isExpired }) => !isExpired)
    const newerVersionsForShoot = filter(validVersions, ({ version }) => semver.gt(version, shootVersion))
    for (const version of newerVersionsForShoot) {
      const diff = semver.diff(version.version, shootVersion)
      if (!newerVersions[diff]) {
        newerVersions[diff] = []
      }
      newerVersions[diff].push(version)
    }
    newerVersions = newerVersionsForShoot.length ? newerVersions : null
    availableKubernetesUpdatesCache.set(key, newerVersions)

    return newerVersions
  }

  function kubernetesVersionIsNotLatestPatch (kubernetesVersion, cloudProfileName) {
    const allVersions = kubernetesVersions(cloudProfileName)
    return some(allVersions, ({ version, isSupported }) => {
      return semver.diff(version, kubernetesVersion) === 'patch' && semver.gt(version, kubernetesVersion) && isSupported
    })
  }

  function kubernetesVersionUpdatePathAvailable (kubernetesVersion, cloudProfileName) {
    const allVersions = kubernetesVersions(cloudProfileName)
    if (kubernetesVersionIsNotLatestPatch(kubernetesVersion, cloudProfileName)) {
      return true
    }
    const versionMinorVersion = semver.minor(kubernetesVersion)
    return some(allVersions, ({ version, isSupported }) => {
      return semver.minor(version) === versionMinorVersion + 1 && isSupported
    })
  }

  function kubernetesVersionExpirationForShoot (shootK8sVersion, shootCloudProfileName, k8sAutoPatch) {
    const allVersions = kubernetesVersions(shootCloudProfileName)
    const version = find(allVersions, { version: shootK8sVersion })
    if (!version) {
      return {
        version: shootK8sVersion,
        expirationDate: UNKNOWN_EXPIRED_TIMESTAMP,
        isValidTerminationDate: false,
        severity: 'warning',
      }
    }

    const patchAvailable = kubernetesVersionIsNotLatestPatch(shootK8sVersion, shootCloudProfileName)
    const updatePathAvailable = kubernetesVersionUpdatePathAvailable(shootK8sVersion, shootCloudProfileName)

    const severity = expirationWarningSeverityForVersion({
      isExpirationWarning: version.isExpirationWarning,
      autoPatchEnabled: k8sAutoPatch,
      updateAvailable: updatePathAvailable,
      autoUpdateAvailable: patchAvailable,
    })

    if (!severity) {
      return undefined
    }

    return {
      expirationDate: version.expirationDate,
      isValidTerminationDate: isValidTerminationDate(version.expirationDate),
      severity,
    }
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
    const minVolumeSize = minimumVolumeSizeByMachineTypeAndVolumeType({ machineType, volumeType })

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
    }
    return worker
  }

  return {
    list,
    isInitial,
    cloudProfileList,
    fetchCloudProfiles,
    cloudProfilesByCloudProviderKind,
    sortedInfrastructureKindList,
    cloudProfileByName,
    regionsWithSeedByCloudProfileName,
    regionsWithoutSeedByCloudProfileName,
    loadBalancerProviderNamesByCloudProfileNameAndRegion,
    getDefaultNodesCIDR,
    floatingPoolNamesByCloudProfileNameAndRegionAndDomain,
    floatingPoolsByCloudProfileNameAndRegionAndDomain,
    loadBalancerClassNamesByCloudProfileName,
    partitionIDsByCloudProfileNameAndRegion,
    firewallImagesByCloudProfileName,
    firewallSizesByCloudProfileNameAndRegion,
    firewallNetworksByCloudProfileNameAndPartitionId,
    defaultKubernetesVersionForCloudProfileName,
    zonesByCloudProfileNameAndRegion,
    machineArchitecturesByCloudProfileNameAndRegion,
    expiringWorkerGroupsForShoot,
    machineTypesByCloudProfileName,
    machineTypesByCloudProfileNameAndRegionAndArchitecture,
    volumeTypesByCloudProfileNameAndRegion,
    volumeTypesByCloudProfileName,
    defaultMachineImageForCloudProfileNameAndMachineType,
    minimumVolumeSizeByMachineTypeAndVolumeType,
    selectedAccessRestrictionsForShootByCloudProfileNameAndRegion,
    labelsByCloudProfileNameAndRegion,
    accessRestrictionNoItemsTextForCloudProfileNameAndRegion,
    kubernetesVersions,
    sortedKubernetesVersions,
    kubernetesVersionIsNotLatestPatch,
    availableKubernetesUpdatesForShoot,
    kubernetesVersionUpdatePathAvailable,
    kubernetesVersionExpirationForShoot,
    seedsByCloudProfileName,
    accessRestrictionDefinitionsByCloudProfileNameAndRegion,
    accessRestrictionsForShootByCloudProfileNameAndRegion,
    loadBalancerClassesByCloudProfileName,
    generateWorker,
    machineImagesByCloudProfileName,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCloudProfileStore, import.meta.hot))
}
