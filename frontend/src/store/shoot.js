//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi, useLogger } from '@/composables'
import { useAuthzStore } from './authz'
import { useCloudProfileStore } from './cloudProfile'
import { useConfigStore } from './config'
import { useSecretStore } from './secret'
import { useAppStore } from './app'
import { useGardenerExtensionStore } from './gardenerExtension'

import cloneDeep from 'lodash/cloneDeep'
import set from 'lodash/set'
import head from 'lodash/head'
import get from 'lodash/get'
import includes from 'lodash/includes'
import isEmpty from 'lodash/isEmpty'
import map from 'lodash/map'
import sample from 'lodash/sample'
import pick from 'lodash/pick'
import omit from 'lodash/omit'
import forEach from 'lodash/forEach'
import filter from 'lodash/filter'

import {
  getSpecTemplate,
  getDefaultZonesNetworkConfiguration,
  getControlPlaneZone,
} from '@/utils/createShoot'
import {
  shortRandomString,
  purposesForSecret,
  parseSize,
  defaultCriNameByKubernetesVersion,
  shootAddonList,
  maintenanceWindowWithBeginAndTimezone,
  randomMaintenanceBegin,
} from '@/utils'
import { v4 as uuidv4 } from '@/utils/uuid'

export const useShootStore = defineStore('shoot', () => {
  const api = useApi()
  const logger = useLogger()
  const authzStore = useAuthzStore()
  const cloudProfileStore = useCloudProfileStore()
  const configStore = useConfigStore()
  const secretStore = useSecretStore()
  const gardenerExtensionsStore = useGardenerExtensionStore()
  const appStore = useAppStore()

  const list = ref(null)
  const newShootResource = ref(null)
  const subscriptionState = ref(null)
  const subscriptionError = ref(null)
  const initialNewShootResource = ref(null)
  const shootListFilters = ref(null)

  const isInitial = computed(() => {
    return list.value === null
  })

  const shootList = computed(() => {
    return list.value ?? []
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

  function generateWorker (availableZones, cloudProfileName, region, kubernetesVersion) {
    const id = uuidv4()
    const name = `worker-${shortRandomString(5)}`
    const zones = !isEmpty(availableZones) ? [sample(availableZones)] : undefined
    const architecture = head(cloudProfileStore.machineArchitecturesByCloudProfileNameAndRegion({ cloudProfileName, region }))
    const machineTypesForZone = cloudProfileStore.machineTypesByCloudProfileNameAndRegionAndArchitecture({ cloudProfileName, region, architecture })
    const machineType = head(machineTypesForZone) || {}
    const volumeTypesForZone = cloudProfileStore.volumeTypesByCloudProfileNameAndRegion({ cloudProfileName, region })
    const volumeType = head(volumeTypesForZone) || {}
    const machineImage = cloudProfileStore.defaultMachineImageForCloudProfileNameAndMachineType(cloudProfileName, machineType)
    const minVolumeSize = cloudProfileStore.minimumVolumeSizeByCloudProfileNameAndRegion({ cloudProfileName, region })

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

  function resetNewShootResource () {
    const shootResource = {
      apiVersion: 'core.gardener.cloud/v1beta1',
      kind: 'Shoot',
      metadata: {
        namespace: authzStore.namespace,
      },
    }

    if (!cloudProfileStore.sortedInfrastructureKindList.length) {
      logger.warn('Could not reset new shoot resource as there is no supported cloud profile')
      return
    }

    const infrastructureKind = head(cloudProfileStore.sortedInfrastructureKindList)
    set(shootResource, 'spec', getSpecTemplate(infrastructureKind, configStore.defaultNodesCIDR))

    const cloudProfileName = get(head(cloudProfileStore.cloudProfilesByCloudProviderKind(infrastructureKind)), 'metadata.name')
    set(shootResource, 'spec.cloudProfileName', cloudProfileName)

    const secret = head(secretStore.infrastructureSecretsByCloudProfileName(cloudProfileName))
    set(shootResource, 'spec.secretBindingName', get(secret, 'metadata.name'))

    let region = head(cloudProfileStore.regionsWithSeedByCloudProfileName(cloudProfileName))
    if (!region) {
      const seedDeterminationStrategySameRegion = configStore.seedCandidateDeterminationStrategy === 'SameRegion'
      if (!seedDeterminationStrategySameRegion) {
        region = head(cloudProfileStore.regionsWithoutSeedByCloudProfileName(cloudProfileName))
      }
    }
    set(shootResource, 'spec.region', region)

    const name = shortRandomString(10)
    set(shootResource, 'metadata.name', name)

    const purpose = head(purposesForSecret(secret))
    set(shootResource, 'spec.purpose', purpose)

    const kubernetesVersion = cloudProfileStore.defaultKubernetesVersionForCloudProfileName(cloudProfileName) || {}
    set(shootResource, 'spec.kubernetes.version', kubernetesVersion.version)
    set(shootResource, 'spec.kubernetes.enableStaticTokenKubeconfig', false)

    const allZones = cloudProfileStore.zonesByCloudProfileNameAndRegion({ cloudProfileName, region })
    const zones = allZones.length ? [sample(allZones)] : undefined
    const zonesNetworkConfiguration = getDefaultZonesNetworkConfiguration(zones, infrastructureKind, allZones.length, configStore.defaultNodesCIDR)
    if (zonesNetworkConfiguration) {
      set(shootResource, 'spec.provider.infrastructureConfig.networks.zones', zonesNetworkConfiguration)
    }

    const newWorker = generateWorker(zones, cloudProfileName, region, kubernetesVersion.version)
    const worker = omit(newWorker, ['id', 'isNew'])
    const workers = [worker]
    set(shootResource, 'spec.provider.workers', workers)

    const networkingType = head(gardenerExtensionsStore.networkingTypes)
    set(shootResource, 'spec.networking.type', networkingType)

    const loadBalancerProviderName = head(cloudProfileStore.loadBalancerProviderNamesByCloudProfileNameAndRegion({ cloudProfileName, region }))
    if (!isEmpty(loadBalancerProviderName)) {
      set(shootResource, 'spec.provider.controlPlaneConfig.loadBalancerProvider', loadBalancerProviderName)
    }
    const secretDomain = get(secret, 'data.domainName')
    const floatingPoolName = head(cloudProfileStore.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({ cloudProfileName, region, secretDomain }))
    if (!isEmpty(floatingPoolName)) {
      set(shootResource, 'spec.provider.infrastructureConfig.floatingPoolName', floatingPoolName)
    }

    const allLoadBalancerClassNames = cloudProfileStore.loadBalancerClassNamesByCloudProfileName(cloudProfileName)
    if (!isEmpty(allLoadBalancerClassNames)) {
      const defaultLoadBalancerClassName = includes(allLoadBalancerClassNames, 'default')
        ? 'default'
        : head(allLoadBalancerClassNames)
      const loadBalancerClasses = [{
        name: defaultLoadBalancerClassName,
      }]
      set(shootResource, 'spec.provider.controlPlaneConfig.loadBalancerClasses', loadBalancerClasses)
    }

    const partitionIDs = cloudProfileStore.partitionIDsByCloudProfileNameAndRegion({ cloudProfileName, region })
    const partitionID = head(partitionIDs)
    if (!isEmpty(partitionID)) {
      set(shootResource, 'spec.provider.infrastructureConfig.partitionID', partitionID)
    }
    const firewallImages = cloudProfileStore.firewallImagesByCloudProfileName(cloudProfileName)
    const firewallImage = head(firewallImages)
    if (!isEmpty(firewallImage)) {
      set(shootResource, 'spec.provider.infrastructureConfig.firewall.image', firewallImage)
    }
    const firewallSizes = map(cloudProfileStore.firewallSizesByCloudProfileNameAndRegionAndArchitecture({ cloudProfileName, region, architecture: newWorker.machine.architecture }), 'name')
    const firewallSize = head(firewallSizes)
    if (!isEmpty(firewallSize)) {
      set(shootResource, 'spec.provider.infrastructureConfig.firewall.size', firewallImage)
    }
    const allFirewallNetworks = cloudProfileStore.firewallNetworksByCloudProfileNameAndPartitionId({ cloudProfileName, partitionID })
    const firewallNetworks = find(allFirewallNetworks, { key: 'internet' })
    if (!isEmpty(firewallNetworks)) {
      set(shootResource, 'spec.provider.infrastructureConfig.firewall.networks', firewallNetworks)
    }

    const controlPlaneZone = getControlPlaneZone(workers, infrastructureKind)
    if (controlPlaneZone) {
      set(shootResource, 'spec.provider.controlPlaneConfig.zone', controlPlaneZone)
    }

    const addons = {}
    forEach(filter(shootAddonList, addon => addon.visible), addon => {
      set(addons, [addon.name, 'enabled'], addon.enabled)
    })

    set(shootResource, 'spec.addons', addons)

    const { begin, end } = maintenanceWindowWithBeginAndTimezone(randomMaintenanceBegin(), appStore.timezone)
    const maintenance = {
      timeWindow: {
        begin,
        end,
      },
      autoUpdate: {
        kubernetesVersion: true,
        machineImageVersion: true,
      },
    }
    set(shootResource, 'spec.maintenance', maintenance)

    let hibernationSchedule = get(configStore.defaultHibernationSchedule, purpose)
    hibernationSchedule = map(hibernationSchedule, schedule => {
      return {
        ...schedule,
        location: appStore.location,
      }
    })
    set(shootResource, 'spec.hibernation.schedules', hibernationSchedule)

    newShootResource.value = shootResource
    initialNewShootResource.value = cloneDeep(shootResource)
  }

  function setShootListFilters (value) {
    shootListFilters.value = value
  }

  function handleEvent () {

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
    subscriptionState,
    subscriptionError,
    isInitial,
    shootList,
    fetchShoots,
    handleEvent,
    subscribe,
    unsubscribe,
    setNewShootResource,
    resetNewShootResource,
    setShootListFilters,
    $reset,
  }
})
