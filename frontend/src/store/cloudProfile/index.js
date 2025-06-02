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
  convertToGi,
  defaultCriNameByKubernetesVersion,
  isValidTerminationDate,
  machineImageHasUpdate,
  machineVendorHasSupportedVersion,
  UNKNOWN_EXPIRED_TIMESTAMP,
  normalizeVersion,
} from '@/utils'
import { v4 as uuidv4 } from '@/utils/uuid'

import { useConfigStore } from '../config'
import { useSeedStore } from '../seed'

import {
  matchesPropertyOrEmpty,
  vendorNameFromMachineImageName,
  findVendorHint,
  decorateClassificationObject,
  firstItemMatchingVersionClassification,
} from './helper'

import filter from 'lodash/filter'
import sortBy from 'lodash/sortBy'
import uniq from 'lodash/uniq'
import map from 'lodash/map'
import get from 'lodash/get'
import set from 'lodash/set'
import some from 'lodash/some'
import intersection from 'lodash/intersection'
import find from 'lodash/find'
import difference from 'lodash/difference'
import toPairs from 'lodash/toPairs'
import includes from 'lodash/includes'
import isEmpty from 'lodash/isEmpty'
import flatMap from 'lodash/flatMap'
import template from 'lodash/template'
import head from 'lodash/head'
import cloneDeep from 'lodash/cloneDeep'
import sample from 'lodash/sample'
import pick from 'lodash/pick'

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

  function flattenMachineImages (machineImages) {
    return flatMap(machineImages, machineImage => {
      const { name, updateStrategy = 'major' } = machineImage

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

        logger.warn(`Skipped machine image ${name} as version ${versionObj.version} is not a valid semver version and cannot be normalized`)
      }
      versions.sort((a, b) => {
        return semver.rcompare(a.version, b.version)
      })

      const vendorName = vendorNameFromMachineImageName(name)
      const displayName = configStore.vendorDisplayName(vendorName)

      const vendorHint = findVendorHint(configStore.vendorHints, vendorName)

      return map(versions, ({ version, expirationDate, cri, classification, architectures }) => {
        if (isEmpty(architectures)) {
          architectures = ['amd64'] // default if not maintained
        }
        return decorateClassificationObject({
          key: name + '/' + version,
          name,
          displayName,
          version,
          updateStrategy,
          cri,
          classification,
          expirationDate,
          vendorName,
          icon: vendorName,
          vendorHint,
          architectures,
        })
      })
    })
  }

  async function fetchCloudProfiles () {
    const response = await api.getCloudProfiles()
    setCloudProfiles(response.data)
  }

  function setCloudProfiles (cloudProfiles) {
    for (const cloudProfile of cloudProfiles) {
      set(cloudProfile, ['data', 'machineImages'], flattenMachineImages(get(cloudProfile, ['data', 'machineImages'])))
    }
    list.value = cloudProfiles
  }

  function isValidRegion (cloudProfile) {
    const providerType = cloudProfile.metadata.providerType
    return region => {
      if (providerType === 'azure') {
        // Azure regions may not be zoned, need to filter these out for the dashboard
        return !!zonesByCloudProfileAndRegion({ cloudProfile, region }).length
      }

      // Filter regions that are not defined in cloud profile
      return some(cloudProfile.data.regions, ['name', region])
    }
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
    'local',
  ])

  const providerTypesList = computed(() => {
    return uniq(map(list.value, 'metadata.providerType'))
  })

  const sortedProviderTypeList = computed(() => {
    return intersection(knownProviderTypesList.value, providerTypesList.value)
  })

  function cloudProfilesByProviderType (providerType) {
    const predicate = item => item.metadata.providerType === providerType
    const filteredCloudProfiles = filter(list.value, predicate)
    return sortBy(filteredCloudProfiles, 'metadata.name')
  }

  function cloudProfileByRef (cloudProfileRef) {
    if (cloudProfileRef?.kind !== 'CloudProfile') {
      return null
    }
    return find(list.value, ['metadata.name', cloudProfileRef?.name])
  }

  function seedsByCloudProfileRef (cloudProfileRef) {
    const cloudProfile = cloudProfileByRef(cloudProfileRef)
    return seedStore.seedsForCloudProfile(cloudProfile)
  }

  function zonesByCloudProfileRefAndRegion ({ cloudProfileRef, region }) {
    const cloudProfile = cloudProfileByRef(cloudProfileRef)
    return zonesByCloudProfileAndRegion({ cloudProfile, region })
  }

  function zonesByCloudProfileAndRegion ({ cloudProfile, region }) {
    if (!cloudProfile) {
      return []
    }
    return map(get(find(cloudProfile.data.regions, { name: region }), ['zones']), 'name')
  }

  function regionsWithSeedByCloudProfileRef (cloudProfileRef) {
    const cloudProfile = cloudProfileByRef(cloudProfileRef)
    return _regionsWithSeedByCloudProfile(cloudProfile)
  }

  function _regionsWithSeedByCloudProfile (cloudProfile) {
    if (!cloudProfile) {
      return []
    }
    const seeds = seedStore.seedsForCloudProfile(cloudProfile)

    const uniqueSeedRegions = uniq(map(seeds, 'data.region'))
    const uniqueSeedRegionsWithZones = filter(uniqueSeedRegions, isValidRegion(cloudProfile))
    return uniqueSeedRegionsWithZones
  }

  function regionsWithoutSeedByCloudProfileRef (cloudProfileRef) {
    const cloudProfile = cloudProfileByRef(cloudProfileRef)
    if (!cloudProfile) {
      return []
    }
    const regionsWithSeed = _regionsWithSeedByCloudProfile(cloudProfile)
    const regionsInCloudProfile = map(cloudProfile.data.regions, 'name')
    const regionsInCloudProfileWithZones = filter(regionsInCloudProfile, isValidRegion(cloudProfile))
    const regionsWithoutSeed = difference(regionsInCloudProfileWithZones, regionsWithSeed)
    return regionsWithoutSeed
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

  function getDefaultNodesCIDR (cloudProfileRef) {
    const cloudProfile = cloudProfileByRef(cloudProfileRef)
    return get(cloudProfile, ['data', 'providerConfig', 'defaultNodesCIDR'], configStore.defaultNodesCIDR)
  }

  function floatingPoolsByCloudProfileRefAndRegionAndDomain ({ cloudProfileRef, region, secretDomain }) {
    const cloudProfile = cloudProfileByRef(cloudProfileRef)
    const floatingPools = get(cloudProfile, ['data', 'providerConfig', 'constraints', 'floatingPools'])
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
    const loadBalancerProviders = get(cloudProfile, ['data', 'providerConfig', 'constraints', 'loadBalancerProviders'])
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
    return get(cloudProfile, ['data', 'providerConfig', 'constraints', 'loadBalancerConfig', 'classes'])
  }

  function partitionIDsByCloudProfileRefAndRegion ({ cloudProfileRef, region }) {
    // Partion IDs equal zones for metal infrastructure
    const cloudProfile = cloudProfileByRef(cloudProfileRef)
    if (get(cloudProfile, ['metadata', 'providerType']) !== 'metal') {
      return
    }
    const partitionIDs = zonesByCloudProfileRefAndRegion({ cloudProfileRef, region })
    return partitionIDs
  }

  function firewallSizesByCloudProfileRefAndRegion ({ cloudProfileRef, region }) {
    const cloudProfile = cloudProfileByRef(cloudProfileRef)
    if (get(cloudProfile, ['metadata', 'providerType']) !== 'metal') {
      return
    }
    // Firewall Sizes equals to list of machine types for this cloud provider
    const firewallSizes = machineTypesByCloudProfileRefAndRegionAndArchitecture({ cloudProfileRef, region, architecture: undefined })
    return firewallSizes
  }

  function firewallImagesByCloudProfileRef (cloudProfileRef) {
    const cloudProfile = cloudProfileByRef(cloudProfileRef)
    return get(cloudProfile, ['data', 'providerConfig', 'firewallImages'])
  }

  function firewallNetworksByCloudProfileRefAndPartitionId ({ cloudProfileRef, partitionID }) {
    const cloudProfile = cloudProfileByRef(cloudProfileRef)
    const networks = get(cloudProfile, ['data', 'providerConfig', 'firewallNetworks', partitionID])
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
    const items = get(cloudProfile.data, [type])
    if (!region) {
      return items
    }
    const zones = zonesByCloudProfileRefAndRegion({ cloudProfileRef, region })

    const regionObject = find(cloudProfile.data.regions, { name: region })
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

    if (type === 'machineTypes') {
      items.forEach(item => {
        if (!item.architecture) {
          item.architecture = 'amd64' // default if not maintained
        }
      })
    }

    return filter(items, machineAndVolumeTypePredicate(unavailableItemsInAllZones))
  }

  function machineTypesByCloudProfileRef (cloudProfileRef) {
    return machineTypesOrVolumeTypesByCloudProfileRefAndRegion({ type: 'machineTypes', cloudProfileRef })
  }

  function getVersionExpirationWarningSeverity (options) {
    const {
      isExpirationWarning,
      autoPatchEnabled,
      updateAvailable,
      autoUpdatePossible,
    } = options
    const autoPatchEnabledAndPossible = autoPatchEnabled && autoUpdatePossible
    if (!isExpirationWarning) {
      return autoPatchEnabledAndPossible
        ? 'info'
        : undefined
    }
    if (!updateAvailable) {
      return 'error'
    }
    return 'warning'
  }

  function expiringWorkerGroupsForShoot (shootWorkerGroups, cloudProfileRef, imageAutoPatch) {
    const allMachineImages = machineImagesByCloudProfileRef(cloudProfileRef)
    const workerGroups = map(shootWorkerGroups, worker => {
      const workerImage = get(worker, ['machine', 'image'], {})
      const { name, version } = workerImage
      const workerImageDetails = find(allMachineImages, { name, version })
      if (!workerImageDetails) {
        return {
          ...workerImage,
          expirationDate: UNKNOWN_EXPIRED_TIMESTAMP,
          workerName: worker.name,
          isValidTerminationDate: false,
          severity: 'warning',
          supportedVersionAvailable: false,
        }
      }

      const updateAvailable = machineImageHasUpdate(workerImageDetails, allMachineImages)
      const supportedVersionAvailable = machineVendorHasSupportedVersion(workerImageDetails, allMachineImages)
      const severity = getVersionExpirationWarningSeverity({
        isExpirationWarning: workerImageDetails.isExpirationWarning,
        autoPatchEnabled: imageAutoPatch,
        updateAvailable,
        autoUpdatePossible: updateAvailable,
      })

      return {
        ...workerImageDetails,
        isValidTerminationDate: isValidTerminationDate(workerImageDetails.expirationDate),
        workerName: worker.name,
        severity,
        supportedVersionAvailable,
      }
    })
    return filter(workerGroups, 'severity')
  }

  function machineTypesByCloudProfileRefAndRegionAndArchitecture ({ cloudProfileRef, region, architecture }) {
    const machineTypes = machineTypesOrVolumeTypesByCloudProfileRefAndRegion({
      type: 'machineTypes',
      cloudProfileRef,
      region,
    })

    if (architecture) {
      return filter(machineTypes, { architecture })
    }

    return machineTypes
  }

  function machineArchitecturesByCloudProfileRefAndRegion ({ cloudProfileRef, region }) {
    const machineTypes = machineTypesOrVolumeTypesByCloudProfileRefAndRegion({
      type: 'machineTypes',
      cloudProfileRef,
      region,
    })
    const architectures = uniq(map(machineTypes, 'architecture'))
    return architectures.sort()
  }

  function volumeTypesByCloudProfileRefAndRegion ({ cloudProfileRef, region }) {
    return machineTypesOrVolumeTypesByCloudProfileRefAndRegion({ type: 'volumeTypes', cloudProfileRef, region })
  }

  function volumeTypesByCloudProfileRef (cloudProfileRef) {
    return volumeTypesByCloudProfileRefAndRegion({ cloudProfileRef, region: undefined })
  }

  function machineImagesByCloudProfileRef (cloudProfileRef) {
    const cloudProfile = cloudProfileByRef(cloudProfileRef)
    return get(cloudProfile, ['data', 'machineImages'])
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
    const regionData = find(cloudProfile.data.regions, [['name'], region])
    if (!regionData) {
      return []
    }
    return get(regionData, ['accessRestrictions'], [])
  }

  function defaultMachineImageForCloudProfileRefAndMachineType (cloudProfileRef, machineType) {
    const allMachineImages = machineImagesByCloudProfileRef(cloudProfileRef)
    const machineImages = filter(allMachineImages, ({ architectures }) => includes(architectures, machineType.architecture))
    return firstItemMatchingVersionClassification(machineImages)
  }

  function kubernetesVersions (cloudProfileRef) {
    const cloudProfile = cloudProfileByRef(cloudProfileRef)
    const allVersions = get(cloudProfile, ['data', 'kubernetes', 'versions'], [])
    const validVersions = filter(allVersions, ({ version }) => {
      if (!semver.valid(version)) {
        logger.info(`Skipped Kubernetes version ${version} as it is not a valid semver version`)
        return false
      }
      return true
    })
    return map(validVersions, decorateClassificationObject)
  }

  function sortedKubernetesVersions (cloudProfileRef) {
    const kubernetsVersions = cloneDeep(kubernetesVersions(cloudProfileRef))
    kubernetsVersions.sort((a, b) => {
      return semver.rcompare(a.version, b.version)
    })
    return kubernetsVersions
  }

  function defaultKubernetesVersionForCloudProfileRef (cloudProfileRef) {
    const k8sVersions = sortedKubernetesVersions(cloudProfileRef)
    return firstItemMatchingVersionClassification(k8sVersions)
  }

  function availableKubernetesUpdatesForShoot (shootVersion, cloudProfileRef) {
    if (!shootVersion || !cloudProfileRef) {
      return
    }
    const key = `${shootVersion}_${cloudProfileRef.kind}_${cloudProfileRef.name}`
    let newerVersions = availableKubernetesUpdatesCache.get(key)
    if (newerVersions !== undefined) {
      return newerVersions
    }
    newerVersions = {}
    const allVersions = kubernetesVersions(cloudProfileRef)

    const validVersions = filter(allVersions, ({ isExpired }) => !isExpired)
    const newerVersionsForShoot = filter(validVersions, ({ version }) => semver.gt(version, shootVersion))
    for (const version of newerVersionsForShoot) {
      const diff = semver.diff(version.version, shootVersion)
      /* eslint-disable security/detect-object-injection */
      if (!newerVersions[diff]) {
        newerVersions[diff] = []
      }
      newerVersions[diff].push(version)
      /* eslint-enable security/detect-object-injection */
    }
    newerVersions = newerVersionsForShoot.length ? newerVersions : null
    availableKubernetesUpdatesCache.set(key, newerVersions)

    return newerVersions
  }

  function kubernetesVersionIsNotLatestPatch (kubernetesVersion, cloudProfileRef) {
    const allVersions = kubernetesVersions(cloudProfileRef)
    return some(allVersions, ({ version, isSupported }) => {
      return semver.diff(version, kubernetesVersion) === 'patch' && semver.gt(version, kubernetesVersion) && isSupported
    })
  }

  function kubernetesVersionUpdatePathAvailable (kubernetesVersion, cloudProfileRef) {
    const allVersions = kubernetesVersions(cloudProfileRef)
    if (kubernetesVersionIsNotLatestPatch(kubernetesVersion, cloudProfileRef)) {
      return true
    }

    const nextMinorVersion = semver.minor(kubernetesVersion) + 1
    let hasNextMinorVersion = false
    let hasNewerSupportedMinorVersion = false

    for (const { version, isSupported } of allVersions) {
      const minorVersion = semver.minor(version)
      if (minorVersion === nextMinorVersion) {
        // we can only upgrade one version at a time, therefore we only check if the next version exists
        // as for the current upgrade this is the only relevant version
        hasNextMinorVersion = true
      }
      if (minorVersion >= nextMinorVersion && isSupported) {
        // if no newer supported exists (no need to be next minor) there is no update path
        // this will result in an error in case the current version is about to expire
        // we show this as error information to the user (this should not happen, likely a misconfiguration)
        hasNewerSupportedMinorVersion = true
      }
    }

    return hasNextMinorVersion && hasNewerSupportedMinorVersion
  }

  function kubernetesVersionExpirationForShoot (shootK8sVersion, cloudProfileRef, k8sAutoPatch) {
    const allVersions = kubernetesVersions(cloudProfileRef)
    const version = find(allVersions, { version: shootK8sVersion })
    if (!version) {
      return {
        version: shootK8sVersion,
        expirationDate: UNKNOWN_EXPIRED_TIMESTAMP,
        isValidTerminationDate: false,
        severity: 'warning',
      }
    }

    const patchAvailable = kubernetesVersionIsNotLatestPatch(shootK8sVersion, cloudProfileRef)
    const updatePathAvailable = kubernetesVersionUpdatePathAvailable(shootK8sVersion, cloudProfileRef)

    const severity = getVersionExpirationWarningSeverity({
      isExpirationWarning: version.isExpirationWarning,
      autoPatchEnabled: k8sAutoPatch,
      updateAvailable: updatePathAvailable,
      autoUpdatePossible: patchAvailable,
    })

    if (!severity) {
      return undefined
    }

    return {
      expirationDate: version.expirationDate,
      isExpired: version.isExpired,
      isValidTerminationDate: isValidTerminationDate(version.expirationDate),
      severity,
    }
  }

  function generateWorker (availableZones, cloudProfileRef, region, kubernetesVersion) {
    const id = uuidv4()
    const name = `worker-${shortRandomString(5)}`
    const zones = !isEmpty(availableZones) ? [sample(availableZones)] : undefined
    const architecture = head(machineArchitecturesByCloudProfileRefAndRegion({ cloudProfileRef, region }))
    const machineTypesForZone = machineTypesByCloudProfileRefAndRegionAndArchitecture({ cloudProfileRef, region, architecture })
    const machineType = head(machineTypesForZone) || {}
    const volumeTypesForZone = volumeTypesByCloudProfileRefAndRegion({ cloudProfileRef, region })
    const volumeType = head(volumeTypesForZone) || {}
    const machineImage = defaultMachineImageForCloudProfileRefAndMachineType(cloudProfileRef, machineType)
    const minVolumeSize = minimumVolumeSizeByMachineTypeAndVolumeType({ machineType, volumeType })
    const criNames = map(machineImage?.cri, 'name')
    const criName = defaultCriNameByKubernetesVersion(criNames, kubernetesVersion)

    const defaultVolumeSize = convertToGi(minVolumeSize) <= convertToGi('50Gi') ? '50Gi' : minVolumeSize
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
        name: criName,
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
    setCloudProfiles,
    fetchCloudProfiles,
    cloudProfilesByProviderType,
    sortedProviderTypeList,
    cloudProfileByRef,
    regionsWithSeedByCloudProfileRef,
    regionsWithoutSeedByCloudProfileRef,
    loadBalancerProviderNamesByCloudProfileRefAndRegion,
    getDefaultNodesCIDR,
    floatingPoolNamesByCloudProfileRefAndRegionAndDomain,
    floatingPoolsByCloudProfileRefAndRegionAndDomain,
    loadBalancerClassNamesByCloudProfileRef,
    partitionIDsByCloudProfileRefAndRegion,
    firewallImagesByCloudProfileRef,
    firewallSizesByCloudProfileRefAndRegion,
    firewallNetworksByCloudProfileRefAndPartitionId,
    defaultKubernetesVersionForCloudProfileRef,
    zonesByCloudProfileRefAndRegion,
    machineArchitecturesByCloudProfileRefAndRegion,
    expiringWorkerGroupsForShoot,
    machineTypesByCloudProfileRef,
    machineTypesByCloudProfileRefAndRegionAndArchitecture,
    volumeTypesByCloudProfileRefAndRegion,
    volumeTypesByCloudProfileRef,
    defaultMachineImageForCloudProfileRefAndMachineType,
    minimumVolumeSizeByMachineTypeAndVolumeType,
    accessRestrictionsByCloudProfileRefAndRegion,
    accessRestrictionDefinitionsByCloudProfileRefAndRegion,
    accessRestrictionNoItemsTextForCloudProfileRefAndRegion,
    kubernetesVersions,
    sortedKubernetesVersions,
    kubernetesVersionIsNotLatestPatch,
    availableKubernetesUpdatesForShoot,
    kubernetesVersionUpdatePathAvailable,
    kubernetesVersionExpirationForShoot,
    seedsByCloudProfileRef,
    loadBalancerClassesByCloudProfileRef,
    generateWorker,
    machineImagesByCloudProfileRef,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCloudProfileStore, import.meta.hot))
}
