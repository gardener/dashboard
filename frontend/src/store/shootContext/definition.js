//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  ref,
  shallowRef,
  computed,
  readonly,
  reactive,
  toRef,
} from 'vue'

import { useShootHelper } from '@/composables/useShootHelper'

import utils from '@/utils'
import { v4 as uuidv4 } from '@/utils/uuid'
import {
  findFreeNetworks,
  getControlPlaneZone,
  getKubernetesTemplate,
  getProviderTemplate,
  getNetworkingTemplate,
  getZonesNetworkConfiguration,
} from '@/utils/createShoot'
import {
  scheduleEventsFromCrontabBlocks,
  crontabBlocksFromScheduleEvents,
} from '@/utils/hibernationSchedule'

import {
  NAND,
  normalizeShootManifest,
  getId,
} from './helper'

import {
  get,
  set,
  has,
  map,
  keyBy,
  flatMap,
  unset,
  head,
  find,
  filter,
  difference,
  cloneDeep,
  includes,
  uniq,
  isEqual,
  isEmpty,
  size,
} from '@/lodash'

export function createStoreDefinition (context) {
  const {
    logger,
    appStore,
    authzStore,
    cloudProfileStore,
    configStore,
    gardenerExtensionStore,
    projectStore,
    secretStore,
  } = context

  /* initial manifest */
  const initialManifest = shallowRef(null)

  const initialShootManifest = computed(() => {
    return normalizeShootManifest(initialManifest)
  })

  const initialZones = computed(() => {
    const workers = get(initialManifest.value, 'spec.provider.workers')
    return uniq(flatMap(workers, 'zones'))
  })

  /* manifest */
  const manifest = ref({})

  const shootManifest = computed(() => {
    const object = cloneDeep(manifest.value)
    set(object, 'spec.dns', dns.value)
    set(object, 'spec.hibernation.schedules', hibernationSchedules.value)
    if (!workerless.value) {
      set(object, 'spec.provider.infrastructureConfig.networks.zones', providerInfrastructureConfigNetworksZones.value)
      set(object, 'spec.provider.controlPlaneConfig.zone', providerControlPlaneConfigZone.value)
    }
    return normalizeShootManifest(object)
  })

  function setShootManifest (value) {
    initialManifest.value = value
    manifest.value = cloneDeep(value)
    dns.value = get(manifest.value, 'spec.dns', {})
    hibernationSchedules.value = get(manifest.value, 'spec.hibernation.schedules', [])
  }

  function resetShootManifest () {
    setShootManifest({
      metadata: {
        name: utils.shortRandomString(10),
      },
    })
    resetProviderType()
    resetNetworkingType()
    resetAddons()
    resetMaintenance()
    resetHibernationShedules()
  }

  const isShootDirty = computed(() => {
    return !isEqual(initialShootManifest.value, shootManifest.value)
  })

  /* metadata */
  const shootNamespace = computed(() => {
    return get(manifest.value, 'metadata.namespace', authzStore.namespace)
  })

  const shootProjectName = computed(() => {
    return projectStore.projectNameByNamespace(shootNamespace.value)
  })

  const shootName = computed({
    get () {
      return get(manifest.value, 'metadata.name')
    },
    set (value) {
      set(manifest.value, 'metadata.name', value)
    },
  })

  function getAnnotation (key, defaultValue) {
    return get(manifest.value, `metadata.annotations["${key}"]`, `${defaultValue}`)
  }

  function setAnnotation (key, value) {
    set(manifest.value, `metadata.annotations["${key}"]`, `${value}`)
  }

  function unsetAnnotation (key, value) {
    unset(manifest.value, `metadata.annotations["${key}"]`)
  }

  const creationTimestamp = computed(() => {
    return get(manifest.value, 'metadata.creationTimestamp')
  })

  /* seedName */
  const seedName = computed(() => {
    return get(manifest.value, 'spec.seedName')
  })

  /* kubernetes */
  const kubernetesVersion = computed({
    get () {
      return get(manifest.value, 'spec.kubernetes.version')
    },
    set (value) {
      set(manifest.value, 'spec.kubernetes.version', value)
    },
  })

  function resetKubernetesVersion () {
    const defaultKubernetesVersionDescriptor = cloudProfileStore.defaultKubernetesVersionForCloudProfileName(cloudProfileName.value)
    kubernetesVersion.value = get(defaultKubernetesVersionDescriptor, 'version')
  }

  const kubernetesEnableStaticTokenKubeconfig = computed({
    get () {
      return !!get(manifest.value, 'spec.kubernetes.enableStaticTokenKubeconfig')
    },
    set (value) {
      set(manifest.value, 'spec.kubernetes.enableStaticTokenKubeconfig', !!value)
    },
  })

  function resetKubernetesEnableStaticTokenKubeconfig () {
    kubernetesEnableStaticTokenKubeconfig.value = false
  }

  function resetKubernetes () {
    resetKubernetesVersion()
    resetKubernetesEnableStaticTokenKubeconfig()
  }

  /* cloudProfileName */
  const cloudProfileName = computed({
    get () {
      return get(manifest.value, 'spec.cloudProfileName')
    },
    set (value) {
      set(manifest.value, 'spec.cloudProfileName', value)
      resetNetworkingType()
      resetKubernetesVersion()
      resetSecretBindingName()
      resetRegion()
      resetProviderControlPlaneConfigLoadBalancerClasses()
      resetProviderInfrastructureConfigProjectID()
      resetProviderInfrastructureConfigFirewallImage()
    },
  })

  function resetCloudProfileName () {
    const cloudProfile = head(cloudProfiles.value)
    cloudProfileName.value = get(cloudProfile, 'metadata.name')
  }

  /* secretBindingName */
  const secretBindingName = computed({
    get () {
      return get(manifest.value, 'spec.secretBindingName')
    },
    set (value) {
      set(manifest.value, 'spec.secretBindingName', value)
      resetPurpose()
    },
  })

  const infrastructureSecret = computed({
    get () {
      return find(infrastructureSecrets.value, ['metadata.name', secretBindingName.value])
    },
    set (value) {
      secretBindingName.value = get(value, 'metadata.name')
    },
  })

  function resetSecretBindingName () {
    infrastructureSecret.value = head(infrastructureSecrets.value)
  }

  /* networking */
  const networkingNodes = computed(() => {
    return get(manifest.value, 'spec.networking.nodes')
  })

  const networkingType = computed({
    get () {
      return get(manifest.value, 'spec.networking.type')
    },
    set (value) {
      set(manifest.value, 'spec.networking.type', value)
    },
  })

  function resetNetworkingType () {
    networkingType.value = head(gardenerExtensionStore.networkingTypes)
  }

  /* region */
  const region = computed({
    get () {
      return get(manifest.value, 'spec.region')
    },
    set (value) {
      set(manifest.value, 'spec.region', value)
      resetProviderWorkers()
      resetProviderControlPlaneConfigLoadBalancerProviderName()
      resetProviderInfrastructureConfigPartitionID()
      resetProviderInfrastructureConfigFloatingPoolName()
    },
  })

  function resetRegion () {
    const value = head(regionsWithSeed.value)
    if (value) {
      region.value = value
    } else if (showAllRegions.value) {
      region.value = head(regionsWithoutSeed.value)
    } else {
      region.value = undefined
    }
  }

  /* purpose */
  const purpose = computed({
    get () {
      return get(manifest.value, 'spec.purpose')
    },
    set (value) {
      set(manifest.value, 'spec.purpose', includes(allPurposes.value, value) ? value : '')
      resetHibernationShedules()
    },
  })

  const isShootActionsDisabled = computed(() => {
    return purpose.value === 'infrastructure'
  })

  function resetPurpose () {
    if (!purpose.value) {
      purpose.value = head(allPurposes.value)
    } else if (!includes(allPurposes.value, purpose.value)) {
      purpose.value = ''
    }
  }

  /* provider */
  const providerType = computed({
    get () {
      return get(manifest.value, 'spec.provider.type')
    },
    set (value) {
      set(manifest.value, 'spec.provider.type', value)
      const {
        infrastructureConfig,
        controlPlaneConfig,
      } = getProviderTemplate(providerType.value, defaultNodesCIDR.value)
      set(manifest.value, 'spec.provider.infrastructureConfig', infrastructureConfig)
      set(manifest.value, 'spec.provider.controlPlaneConfig', controlPlaneConfig)
      const networkingTemplate = getNetworkingTemplate(providerType.value, defaultNodesCIDR.value)
      set(manifest.value, 'spec.networking', networkingTemplate)
      const kubernetesTemplate = getKubernetesTemplate(providerType.value, defaultNodesCIDR.value)
      set(manifest.value, 'spec.kubernetes', kubernetesTemplate)
      resetKubernetesEnableStaticTokenKubeconfig()
      resetCloudProfileName()
    },
  })

  function resetProviderType () {
    providerType.value = head(cloudProfileStore.sortedInfrastructureKindList)
  }

  const providerControlPlaneConfigZone = computed({
    get () {
      const value = get(manifest.value, 'spec.provider.controlPlaneConfig.zone')
      return getControlPlaneZone(
        providerWorkers.value,
        providerType.value,
        value,
      )
    },
    set (value) {
      value = getControlPlaneZone(
        providerWorkers.value,
        providerType.value,
        value,
      )
      if (value) {
        set(manifest.value, 'spec.provider.controlPlaneConfig.zone', value)
      } else {
        unset(manifest.value, 'spec.provider.controlPlaneConfig.zone')
      }
    },
  })

  const providerControlPlaneConfigLoadBalancerProviderName = computed({
    get () {
      return get(manifest.value, 'spec.provider.controlPlaneConfig.loadBalancerProvider')
    },
    set (value) {
      set(manifest.value, 'spec.provider.controlPlaneConfig.loadBalancerProvider', value)
    },
  })

  function resetProviderControlPlaneConfigLoadBalancerProviderName () {
    providerControlPlaneConfigLoadBalancerProviderName.value = head(allLoadBalancerProviderNames.value)
  }

  const providerControlPlaneConfigLoadBalancerClassNames = computed({
    get () {
      return map(providerControlPlaneConfigLoadBalancerClasses.value, 'name')
    },
    set (value) {
      providerControlPlaneConfigLoadBalancerClasses.value = map(value, name => ({ name }))
    },
  })

  const providerControlPlaneConfigLoadBalancerClasses = computed({
    get () {
      return get(manifest.value, 'spec.provider.controlPlaneConfig.loadBalancerClasses')
    },
    set (value) {
      set(manifest.value, 'spec.provider.controlPlaneConfig.loadBalancerClasses', value)
    },
  })

  function resetProviderControlPlaneConfigLoadBalancerClasses () {
    const loadBalancerClassName = includes(allLoadBalancerClassNames.value, 'default')
      ? 'default'
      : head(allLoadBalancerClassNames.value)
    providerControlPlaneConfigLoadBalancerClassNames.value = loadBalancerClassName
      ? [loadBalancerClassName]
      : []
  }

  const providerInfrastructureConfigPartitionID = computed({
    get () {
      return get(manifest.value, 'spec.provider.infrastructureConfig.partitionID')
    },
    set (value) {
      set(manifest.value, 'spec.provider.infrastructureConfig.partitionID', value)
      resetProviderInfrastructureConfigFirewallSize()
      resetProviderInfrastructureConfigFirewallNetworks()
    },
  })

  function resetProviderInfrastructureConfigPartitionID () {
    providerInfrastructureConfigPartitionID.value = head(partitionIDs.value)
  }

  const allFirewallNetworks = computed(() => {
    return cloudProfileStore.firewallNetworksByCloudProfileNameAndPartitionId({
      cloudProfileName: cloudProfileName.value,
      partitionID: providerInfrastructureConfigPartitionID.value,
    })
  })

  const providerInfrastructureConfigProjectID = computed({
    get () {
      return get(manifest.value, 'spec.provider.infrastructureConfig.projectID')
    },
    set (value) {
      set(manifest.value, 'spec.provider.infrastructureConfig.projectID', value)
    },
  })

  function resetProviderInfrastructureConfigProjectID () {
    providerInfrastructureConfigProjectID.value = undefined
  }

  const providerInfrastructureConfigFloatingPoolName = computed({
    get () {
      return get(manifest.value, 'spec.provider.infrastructureConfig.floatingPoolName')
    },
    set (value) {
      set(manifest.value, 'spec.provider.infrastructureConfig.floatingPoolName', value)
    },
  })

  function resetProviderInfrastructureConfigFloatingPoolName () {
    providerInfrastructureConfigFloatingPoolName.value = head(allFloatingPoolNames.value)
  }

  const providerInfrastructureConfigFirewallImage = computed({
    get () {
      return get(manifest.value, 'spec.provider.infrastructureConfig.firewall.image')
    },
    set (value) {
      set(manifest.value, 'spec.provider.infrastructureConfig.firewall.image', value)
    },
  })

  function resetProviderInfrastructureConfigFirewallImage () {
    providerInfrastructureConfigFirewallImage.value = head(firewallImages.value)
  }

  const providerInfrastructureConfigFirewallSize = computed({
    get () {
      return get(manifest.value, 'spec.provider.infrastructureConfig.firewall.size')
    },
    set (value) {
      set(manifest.value, 'spec.provider.infrastructureConfig.firewall.size', value)
    },
  })

  function resetProviderInfrastructureConfigFirewallSize () {
    providerInfrastructureConfigFirewallSize.value = head(firewallSizes.value)
  }

  const providerInfrastructureConfigFirewallNetworks = computed({
    get () {
      return get(manifest.value, 'spec.provider.infrastructureConfig.firewall.networks')
    },
    set (value) {
      set(manifest.value, 'spec.provider.infrastructureConfig.firewall.networks', value)
    },
  })

  function resetProviderInfrastructureConfigFirewallNetworks () {
    const internetFirewallNetwork = find(allFirewallNetworks.value, ['key', 'internet'])
    providerInfrastructureConfigFirewallNetworks.value = internetFirewallNetwork
      ? [internetFirewallNetwork.value]
      : undefined
  }

  const providerWorkers = computed({
    get () {
      return get(manifest.value, 'spec.provider.workers', [])
    },
    set (value = []) {
      if (isEmpty(value) && !isNewCluster.value) {
        throw new TypeError('A cluster\'s workerless property is immutable')
      }
      set(manifest.value, 'spec.provider.workers', value)
    },
  })

  function resetProviderWorkers () {
    providerWorkers.value = [
      generateProviderWorker(availableZones.value),
    ]
  }

  function addProviderWorker () {
    providerWorkers.value = [
      ...providerWorkers.value,
      generateProviderWorker(usedZones.value),
    ]
  }

  function removeProviderWorker (id) {
    providerWorkers.value = filter(providerWorkers.value, worker => worker.id !== id)
  }

  const workerless = computed({
    get () {
      return isEmpty(providerWorkers.value)
    },
    set (value) {
      if (!value) {
        resetProviderWorkers()
        resetAddons()
      } else {
        providerWorkers.value = []
        addons.value = []
      }
    },
  })

  function generateProviderWorker (zones) {
    const { id, isNew, ...worker } = cloudProfileStore.generateWorker(
      !isEmpty(zones)
        ? zones
        : availableZones.value,
      cloudProfileName.value,
      region.value,
      kubernetesVersion.value,
    )
    Object.defineProperty(worker, 'id', { value: id })
    Object.defineProperty(worker, 'isNew', { value: isNew })
    return worker
  }

  /* providerInfrastructureConfigNetworksZones */
  const providerInfrastructureConfigNetworksZones = computed({
    get () {
      const value = get(manifest.value, 'spec.provider.infrastructureConfig.networks.zones')
      const args = creationTimestamp.value
        ? [networkingNodes.value, undefined]
        : [undefined, networkingNodes.value]
      return getZonesNetworkConfiguration(
        value,
        providerWorkers.value,
        providerType.value,
        size(allZones.value),
        ...args,
      )
    },
    set (value) {
      set(manifest.value, 'spec.provider.infrastructureConfig.networks.zones', value)
    },
  })

  const zonesWithNetworkConfigInShoot = computed(() => {
    return map(providerInfrastructureConfigNetworksZones.value, 'name')
  })

  const usedZones = computed(() => {
    return uniq(flatMap(providerWorkers.value, 'zones'))
  })

  const unusedZones = computed(() => {
    return difference(allZones.value, usedZones.value)
  })

  const availableZones = computed(() => {
    if (!isZonedCluster.value) {
      return []
    }
    if (isNewCluster.value) {
      return allZones.value
    }
    // Ensure that only zones can be selected, that have a network config in providerConfig (if required)
    // or that free networks are available to select more zones
    const isZonesNetworkConfigurationRequired = !isEmpty(zonesWithNetworkConfigInShoot.value)
    if (!isZonesNetworkConfigurationRequired) {
      return allZones.value
    }

    if (size(freeNetworks.value)) {
      return allZones.value
    }

    return zonesWithNetworkConfigInShoot.value
  })

  const freeNetworks = computed(() => {
    return findFreeNetworks(
      providerInfrastructureConfigNetworksZones.value,
      networkingNodes.value ?? defaultNodesCIDR.value,
      providerType.value,
      size(allZones.value),
    )
  })

  const maxAdditionalZones = computed(() => {
    const NO_LIMIT = -1
    if (isNewCluster.value) {
      return NO_LIMIT
    }
    const isZonesNetworkConfigurationRequired = !isEmpty(zonesWithNetworkConfigInShoot.value)
    if (!isZonesNetworkConfigurationRequired) {
      return NO_LIMIT
    }
    const numberOfFreeNetworks = size(freeNetworks.value)
    const hasFreeNetworks = numberOfFreeNetworks >= size(unusedZones)
    if (hasFreeNetworks) {
      return NO_LIMIT
    }
    return numberOfFreeNetworks
  })

  /* addons */
  const addons = computed({
    get () {
      return get(manifest.value, 'spec.addons', {})
    },
    set (value) {
      set(manifest.value, 'spec.addons', value)
    },
  })

  function resetAddons () {
    const defaultAddons = {}
    for (const { name, enabled } of visibleAddonDefinitionList.value) {
      defaultAddons[name] = { enabled }
    }
    addons.value = defaultAddons
  }

  const visibleAddonDefinitionList = computed(() => {
    return filter(utils.shootAddonList, 'visible')
  })

  const addonDefinitionList = computed(() => {
    return filter(utils.shootAddonList, ({ name, visible }) => visible || has(addons.value, name))
  })

  const addonDefinitions = computed(() => {
    return keyBy(addonDefinitionList.value, 'name')
  })

  function getAddonEnabled (name) {
    return get(addons.value, [name, 'enabled'], false)
  }

  function setAddonEnabled (name, value) {
    set(addons.value, [name, 'enabled'], value)
  }

  /* maintenance */
  const maintenanceTimeWindowBegin = computed({
    get () {
      return get(manifest.value, 'spec.maintenance.timeWindow.begin')
    },
    set (value) {
      set(manifest.value, 'spec.maintenance.timeWindow.begin', value)
    },
  })

  const maintenanceTimeWindowEnd = computed({
    get () {
      return get(manifest.value, 'spec.maintenance.timeWindow.end')
    },
    set (value) {
      set(manifest.value, 'spec.maintenance.timeWindow.end', value)
    },
  })

  function resetMaintenanceTimeWindow () {
    const maintenanceBegin = utils.randomMaintenanceBegin()
    const timeWindow = utils.maintenanceWindowWithBeginAndTimezone(maintenanceBegin, appStore.timezone)
    maintenanceTimeWindowBegin.value = timeWindow.begin
    maintenanceTimeWindowEnd.value = timeWindow.end
  }

  /* maintenanceAutoUpdateKubernetesVersion */
  const maintenanceAutoUpdateKubernetesVersion = computed({
    get () {
      return get(manifest.value, 'spec.maintenance.autoUpdate.kubernetesVersion', true)
    },
    set (value) {
      set(manifest.value, 'spec.maintenance.autoUpdate.kubernetesVersion', value)
    },
  })

  const maintenanceAutoUpdateMachineImageVersion = computed({
    get () {
      return get(manifest.value, 'spec.maintenance.autoUpdate.machineImageVersion', true)
    },
    set (value) {
      set(manifest.value, 'spec.maintenance.autoUpdate.machineImageVersion', value)
    },
  })

  function resetMaintenanceAutoUpdate () {
    maintenanceAutoUpdateKubernetesVersion.value = true
    maintenanceAutoUpdateMachineImageVersion.value = true
  }

  function resetMaintenance () {
    resetMaintenanceTimeWindow()
    resetMaintenanceAutoUpdate()
  }

  /* hibernation */
  const noHibernationSchedules = computed({
    get () {
      return getAnnotation('dashboard.garden.sapcloud.io/no-hibernation-schedule', 'false') === 'true'
    },
    set (value) {
      if (value) {
        setAnnotation('dashboard.garden.sapcloud.io/no-hibernation-schedule', 'true')
      } else {
        unsetAnnotation('dashboard.garden.sapcloud.io/no-hibernation-schedule')
      }
    },
  })

  const hibernationSchedules = computed({
    get () {
      return crontabBlocksFromScheduleEvents(hibernationState.scheduleEvents)
    },
    set (value) {
      try {
        const scheduleEvents = scheduleEventsFromCrontabBlocks(value, appStore.location)
        hibernationState.cronExpressionSyntaxError = null
        hibernationState.scheduleEvents = scheduleEvents
      } catch (err) {
        logger.warn(err.message)
        hibernationState.cronExpressionSyntaxError = err
      }
    },
  })

  function resetHibernationShedules () {
    const location = appStore.location
    const defaultCrontabBlocks = get(configStore.defaultHibernationSchedule, purpose.value)
    hibernationSchedules.value = map(defaultCrontabBlocks, crontabBlock => ({ ...crontabBlock, location }))
    noHibernationSchedules.value = false
  }

  function createHibernationScheduleEvent (start = {}, end = {}) {
    const scheduleEvent = {
      start,
      end,
      location: appStore.location,
    }
    Object.defineProperty(scheduleEvent, 'id', {
      value: uuidv4(),
    })
    return scheduleEvent
  }

  function getHibernationScheduleEvent (id) {
    return find(hibernationState.scheduleEvents, ['id', id])
  }

  function addHibernationScheduleEvent () {
    const defaultCrontabBlocks = get(configStore.defaultHibernationSchedule, purpose.value)
    if (!isEmpty(hibernationState.scheduleEvents) || isEmpty(defaultCrontabBlocks)) {
      hibernationState.scheduleEvents.push(createHibernationScheduleEvent())
      noHibernationSchedules.value = false
    } else {
      resetHibernationShedules()
    }
  }

  function removeHibernationScheduleEvent (id) {
    hibernationState.scheduleEvents = filter(hibernationState.scheduleEvents, scheduleEvent => scheduleEvent.id !== id)
  }

  const hibernationState = reactive({
    scheduleEvents: [],
    cronExpressionSyntaxError: null,
  })

  const hibernationSchedulesError = toRef(hibernationState, 'cronExpressionSyntaxError')
  const hibernationScheduleEvents = toRef(hibernationState, 'scheduleEvents')

  /* controlPlane */
  const controlPlaneHighAvailabilityFailureToleranceType = computed({
    get () {
      return get(manifest.value, 'spec.controlPlane.highAvailability.failureTolerance.type')
    },
    set (value) {
      if (value) {
        set(manifest.value, 'spec.controlPlane.highAvailability.failureTolerance.type', value)
      } else {
        unset(manifest.value, 'spec.controlPlane.highAvailability')
      }
    },
  })

  const controlPlaneHighAvailabilityFailureToleranceTypeChangeAllowed = computed(() => {
    const oldControlPlaneFailureToleranceType = get(initialShootManifest.value, 'spec.controlPlane.highAvailability.failureTolerance.type')
    return isNewCluster.value || !oldControlPlaneFailureToleranceType
  })

  function resetControlPlaneFailureToleranceType () {
    if (!controlPlaneHighAvailabilityFailureToleranceTypeChangeAllowed.value) {
      return
    }
    if (!isFailureToleranceTypeZoneSupported.value) {
      if (controlPlaneHighAvailabilityFailureToleranceType.value === 'node') {
        controlPlaneHighAvailabilityFailureToleranceType.value = 'zone'
      }
    } else {
      if (controlPlaneHighAvailabilityFailureToleranceType.value === 'zone') {
        controlPlaneHighAvailabilityFailureToleranceType.value = 'node'
      }
    }
  }

  const controlPlaneHighAvailability = computed({
    get () {
      return !!controlPlaneHighAvailabilityFailureToleranceType.value
    },
    set (value) {
      if (!value) {
        controlPlaneHighAvailabilityFailureToleranceType.value = undefined
      } else {
        controlPlaneHighAvailabilityFailureToleranceType.value = isFailureToleranceTypeZoneSupported.value
          ? 'zone'
          : 'node'
      }
    },
  })

  /* dns */
  const dnsState = reactive({
    domain: undefined,
    providers: {},
    providerIds: [],
    primaryProviderId: undefined,
  })

  const dns = computed({
    get () {
      const providers = map(dnsProviderIds.value, id => {
        const {
          type,
          secretName,
          excludeDomains,
          includeDomains,
          excludeZones,
          includeZones,
        } = dnsProviders.value[id]
        const primary = dnsPrimaryProviderId.value === id
        const provider = {
          type,
          secretName,
          primary,
        }
        if (!isEmpty(excludeDomains)) {
          set(provider, 'domains.exclude', [...excludeDomains])
        }
        if (!isEmpty(includeDomains)) {
          set(provider, 'domains.include', [...includeDomains])
        }
        if (!isEmpty(excludeZones)) {
          set(provider, 'zones.exclude', [...excludeZones])
        }
        if (!isEmpty(includeZones)) {
          set(provider, 'zones.include', [...includeZones])
        }
        return provider
      })
      const domain = dnsDomain.value
      const dns = { providers }
      if (domain) {
        dns.domain = domain
      }
      return dns
    },
    set ({ domain, providers }) {
      const dnsProviderList = map(providers, provider => {
        const id = uuidv4()
        const {
          type,
          secretName,
          primary = false,
          domains: {
            exclude: excludeDomains = [],
            include: includeDomains = [],
          } = {},
          zones: {
            exclude: excludeZones = [],
            include: includeZones = [],
          } = {},
        } = provider
        if (primary) {
          dnsPrimaryProviderId.value = id
        }
        let readonly = false
        if (!isNewCluster.value) {
          const secret = findDnsProviderSecret(type, secretName)
          // If no secret binding was found for a given secretName and the cluster is not new,
          // then we assume that the secret exists and was created by hand.
          // The DNS provider should not be changed in this case.
          if (!secret) {
            readonly = true
          }
        }
        return {
          id,
          type,
          secretName,
          excludeDomains: [...excludeDomains],
          includeDomains: [...includeDomains],
          excludeZones: [...excludeZones],
          includeZones: [...includeZones],
          readonly,
        }
      })
      dnsDomain.value = domain
      dnsProviders.value = keyBy(dnsProviderList, 'id')
      dnsProviderIds.value = map(dnsProviderList, 'id')
      if (!domain && isEmpty(providers)) {
        unset(manifest.value, 'spec.dns')
      } else {
        set(manifest.value, 'spec.dns', { domain, providers })
      }
    },
  })

  const dnsDomain = computed({
    get () {
      return dnsState.domain
    },
    set (value) {
      dnsState.domain = value
      resetDnsPrimaryProviderId()
    },
  })

  const dnsProviders = computed({
    get () {
      return dnsState.providers
    },
    set (value) {
      dnsState.providers = value
    },
  })

  const dnsProviderIds = computed({
    get () {
      return dnsState.providerIds
    },
    set (value) {
      dnsState.providerIds = value
    },
  })

  const dnsPrimaryProviderId = computed({
    get () {
      return dnsState.primaryProviderId
    },
    set (value) {
      dnsState.primaryProviderId = value
    },
  })

  function resetDnsPrimaryProviderId () {
    if (!dnsDomain.value) {
      dnsPrimaryProviderId.value = null
    } else if (!dnsPrimaryProviderId.value) {
      const defaultDnsPrimaryProvider = head(dnsProvidersWithPrimarySupport.value)
      const id = getId(defaultDnsPrimaryProvider)
      if (id) {
        dnsPrimaryProviderId.value = id
      }
    }
  }

  const dnsPrimaryProvider = computed({
    get () {
      return dnsProviders.value[dnsPrimaryProviderId.value]
    },
    set (value) {
      dnsPrimaryProviderId.value = getId(value)
    },
  })

  const dnsProvidersWithPrimarySupport = computed(() => {
    const hasPrimarySupport = type => includes(gardenerExtensionStore.dnsProviderTypesWithPrimarySupport, type)
    return filter(dnsProviders.value, ({ type, secretName }) => hasPrimarySupport(type) && !!secretName)
  })

  function createDnsProvider () {
    const type = head(gardenerExtensionStore.dnsProviderTypes)
    const secrets = secretStore.dnsSecretsByProviderKind(type)
    const secret = head(secrets)
    const secretName = get(secret, 'metadata.name')
    const id = uuidv4()
    const object = {
      type,
      secretName,
      excludeDomains: [],
      includeDomains: [],
      excludeZones: [],
      includeZones: [],
      readonly: false,
    }
    Object.defineProperty(object, 'id', { value: id })
    return object
  }

  function addDnsProvider () {
    const object = createDnsProvider()
    const id = getId(object)
    dnsProviderIds.value.push(id)
    dnsProviders.value[id] = object
    resetDnsPrimaryProviderId()
  }

  function patchDnsProvider (object) {
    const id = getId(object)
    const index = dnsProviderIds.value.indexOf(id)
    if (index !== -1 && has(dnsProviders.value, id)) {
      for (const [key, value] of Object.entries(object)) {
        dnsProviders.value[id][key] = value
      }
    }
  }

  function deleteDnsProvider (id) {
    const index = dnsProviderIds.value.indexOf(id)
    if (index !== -1) {
      dnsProviderIds.value.splice(index, 1)
    }
    delete dnsProviders.value[id]
    if (isEmpty(dnsProviderIds.value)) {
      dnsDomain.value = null
      dnsPrimaryProviderId.value = null
    } else if (dnsPrimaryProviderId.value === id) {
      dnsPrimaryProviderId.value = null
    }
  }

  function findDnsProviderSecret (type, secretName) {
    const secrets = secretStore.dnsSecretsByProviderKind(type)
    return find(secrets, ['metadata.secretRef.name', secretName])
  }

  /* accessRestrictions */
  function getAccessRestrictionValue (key) {
    const { input } = accessRestrictionDefinitions.value[key]
    const inverted = !!input?.inverted
    const defaultValue = inverted
    const value = getSeedSelectorMatchLabel(key, defaultValue) === 'true'
    return NAND(value, inverted)
  }

  function setAccessRestrictionValue (key, value) {
    const { input, options } = accessRestrictionDefinitions.value[key]
    const enabled = NAND(value, !!input?.inverted)
    if (enabled) {
      setSeedSelectorMatchLabel(key, 'true')
    } else {
      unsetSeedSelectorMatchLabel(key)
      for (const key of Object.keys(options)) {
        unsetAnnotation(key)
      }
    }
  }

  function getAccessRestrictionOptionValue (key) {
    const { accessRestrictionKey } = accessRestrictionOptionDefinitions.value[key]
    const { input } = get(accessRestrictionDefinitions.value, [accessRestrictionKey, 'options', key])
    const inverted = !!input?.inverted
    const defaultValue = inverted
    const value = getAnnotation(key, defaultValue) === 'true'
    return NAND(value, !!input?.inverted)
  }

  function setAccessRestrictionOptionValue (key, value) {
    const { accessRestrictionKey } = accessRestrictionOptionDefinitions.value[key]
    const { input } = get(accessRestrictionDefinitions.value, [accessRestrictionKey, 'options', key])
    const inverted = !!input?.inverted
    setAnnotation(key, NAND(value, inverted))
  }

  const accessRestrictionList = computed(() => {
    const accessRestrictionList = []
    for (const definition of accessRestrictionDefinitionList.value) {
      const {
        key,
        display: {
          visibleIf = false,
          title = key,
          description,
        },
        options: optionDefinitions,
      } = definition

      const value = getAccessRestrictionValue(key)
      if (visibleIf !== value) {
        continue // skip
      }

      const accessRestrictionOptionList = []
      for (const optionDefinition of optionDefinitions) {
        const {
          key,
          display: {
            visibleIf = false,
            title = key,
            description,
          },
        } = optionDefinition

        const value = getAccessRestrictionOptionValue(key)
        if (value !== visibleIf) {
          continue // skip
        }

        accessRestrictionOptionList.push({
          key,
          title,
          description,
        })
      }

      accessRestrictionList.push({
        key,
        title,
        description,
        options: accessRestrictionOptionList,
      })
    }

    return accessRestrictionList
  })

  /* seedSelector */
  function getSeedSelectorMatchLabel (key, defaultValue) {
    return get(manifest.value, `spec.seedSelector.matchLabels["${key}"]`, `${defaultValue}`)
  }

  function setSeedSelectorMatchLabel (key, value) {
    set(manifest.value, `spec.seedSelector.matchLabels["${key}"]`, `${value}`)
  }

  function unsetSeedSelectorMatchLabel (key, value) {
    unset(manifest.value, `spec.seedSelector.matchLabels["${key}"]`)
  }

  const {
    isNewCluster,
    cloudProfiles,
    cloudProfile,
    isZonedCluster,
    seed,
    seeds,
    isFailureToleranceTypeZoneSupported,
    allZones,
    defaultNodesCIDR,
    infrastructureSecrets,
    sortedKubernetesVersions,
    kubernetesVersionIsNotLatestPatch,
    allPurposes,
    regionsWithSeed,
    regionsWithoutSeed,
    allLoadBalancerProviderNames,
    allLoadBalancerClassNames,
    partitionIDs,
    firewallImages,
    firewallSizes,
    allFloatingPoolNames,
    accessRestrictionDefinitionList,
    accessRestrictionDefinitions,
    accessRestrictionOptionDefinitions,
    accessRestrictionNoItemsText,
    allMachineTypes,
    machineArchitectures,
    volumeTypes,
    machineImages,
    networkingTypes,
    showAllRegions,
  } = useShootHelper(readonly({
    creationTimestamp,
    cloudProfileName,
    seedName,
    region,
    secretBindingName,
    kubernetesVersion,
    networkingNodes,
    providerType,
  }), context)

  return {
    /* manifest */
    shootManifest,
    setShootManifest,
    resetShootManifest,
    isShootDirty,
    /* metadata */
    shootName,
    shootNamespace,
    shootProjectName,
    isNewCluster,
    /* purpose */
    purpose,
    isShootActionsDisabled,
    /* cloudProfileName */
    cloudProfileName,
    resetCloudProfileName,
    /* region */
    region,
    /* seedName */
    seedName,
    /* secretBindingName */
    secretBindingName,
    resetSecretBindingName,
    infrastructureSecret,
    /* kubernetes */
    kubernetesVersion,
    resetKubernetes,
    kubernetesEnableStaticTokenKubeconfig,
    resetKubernetesEnableStaticTokenKubeconfig,
    /* networking */
    networkingType,
    resetNetworkingType,
    networkingNodes,
    /* provider */
    providerType,
    resetProviderType,
    /* provider - controlPlaneConfig */
    providerControlPlaneConfigLoadBalancerProviderName,
    providerControlPlaneConfigLoadBalancerClasses,
    providerControlPlaneConfigLoadBalancerClassNames,
    providerControlPlaneConfigZone,
    /* provider - infrastructureConfig */
    providerInfrastructureConfigFirewallImage,
    providerInfrastructureConfigFirewallNetworks,
    providerInfrastructureConfigFirewallSize,
    providerInfrastructureConfigFloatingPoolName,
    providerInfrastructureConfigNetworksZones,
    providerInfrastructureConfigPartitionID,
    providerInfrastructureConfigProjectID,
    /* provider - workers */
    providerWorkers,
    resetProviderWorkers,
    addProviderWorker,
    removeProviderWorker,
    workerless,
    usedZones,
    unusedZones,
    availableZones,
    /* hibernation */
    maintenanceTimeWindowBegin,
    maintenanceTimeWindowEnd,
    resetMaintenanceTimeWindow,
    maintenanceAutoUpdateKubernetesVersion,
    maintenanceAutoUpdateMachineImageVersion,
    resetMaintenanceAutoUpdate,
    /* hibernation */
    hibernationSchedules,
    resetHibernationShedules,
    hibernationSchedulesError,
    hibernationScheduleEvents,
    getHibernationScheduleEvent,
    addHibernationScheduleEvent,
    removeHibernationScheduleEvent,
    noHibernationSchedules,
    /* controlPlane - highAvailability */
    controlPlaneHighAvailability,
    controlPlaneHighAvailabilityFailureToleranceType,
    resetControlPlaneFailureToleranceType,
    controlPlaneHighAvailabilityFailureToleranceTypeChangeAllowed,
    /* dns */
    dns,
    dnsDomain,
    dnsProviders,
    dnsProviderIds,
    dnsPrimaryProvider,
    dnsProvidersWithPrimarySupport,
    addDnsProvider,
    patchDnsProvider,
    deleteDnsProvider,
    resetDnsPrimaryProviderId,
    /* accessRestrictions */
    accessRestrictionList,
    getAccessRestrictionValue,
    setAccessRestrictionValue,
    getAccessRestrictionOptionValue,
    setAccessRestrictionOptionValue,
    accessRestrictionDefinitions,
    accessRestrictionNoItemsText,
    /* addons */
    addons,
    getAddonEnabled,
    setAddonEnabled,
    resetAddons,
    addonDefinitions,
    addonDefinitionList,
    visibleAddonDefinitionList,
    /* helper */
    cloudProfiles,
    cloudProfile,
    isZonedCluster,
    seed,
    seeds,
    isFailureToleranceTypeZoneSupported,
    allZones,
    initialZones,
    availableZones,
    maxAdditionalZones,
    defaultNodesCIDR,
    infrastructureSecrets,
    sortedKubernetesVersions,
    kubernetesVersionIsNotLatestPatch,
    allPurposes,
    regionsWithSeed,
    regionsWithoutSeed,
    allLoadBalancerProviderNames,
    allLoadBalancerClassNames,
    partitionIDs,
    firewallImages,
    firewallSizes,
    allFirewallNetworks,
    allFloatingPoolNames,
    allMachineTypes,
    machineArchitectures,
    volumeTypes,
    machineImages,
    networkingTypes,
    showAllRegions,
    /* aliases */
    name: shootName,
    infrastructureKind: providerType,
    workers: providerWorkers,
    dnsConfiguration: dns,
    enableStaticTokenKubeconfig: kubernetesEnableStaticTokenKubeconfig,
    firewallImage: providerInfrastructureConfigFirewallImage,
    firewallNetworks: providerInfrastructureConfigFirewallNetworks,
    firewallSize: providerInfrastructureConfigFirewallSize,
    floatingPoolName: providerInfrastructureConfigFloatingPoolName,
    zonesNetworkConfiguration: providerInfrastructureConfigNetworksZones,
    partitionID: providerInfrastructureConfigPartitionID,
    projectID: providerInfrastructureConfigProjectID,
    updateOSMaintenance: maintenanceAutoUpdateMachineImageVersion,
    updateK8sMaintenance: maintenanceAutoUpdateKubernetesVersion,
    osUpdates: maintenanceAutoUpdateMachineImageVersion,
    k8sUpdates: maintenanceAutoUpdateKubernetesVersion,
    controlPlaneFailureToleranceType: controlPlaneHighAvailabilityFailureToleranceType,
    controlPlaneFailureToleranceTypeChangeAllowed: controlPlaneHighAvailabilityFailureToleranceTypeChangeAllowed,
  }
}
