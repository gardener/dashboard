//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//
import {
  ref,
  shallowRef,
  reactive,
  computed,
} from 'vue'

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
  difference,
  find,
  some,
  filter,
  cloneDeep,
  includes,
  uniq,
  isEqual,
  isEmpty,
  size,
} from '@/lodash'

export function createStoreDefinition (context) {
  const {
    appStore,
    authzStore,
    cloudProfileStore,
    configStore,
    gardenerExtensionStore,
    projectStore,
    secretStore,
    seedStore,
  } = context

  /* manifest */
  const initialManifest = shallowRef(null)
  const manifest = ref({})

  const initialShootManifest = computed(() => {
    return normalizeShootManifest(initialManifest)
  })

  const initialZones = computed(() => {
    const workers = get(initialManifest.value, 'spec.provider.workers')
    return uniq(flatMap(workers, 'zones'))
  })

  const shootManifest = computed(() => {
    const object = cloneDeep(manifest.value)
    set(object, 'spec.dns', dns.value)
    if (!isEmpty(providerWorkers.value)) {
      set(object, 'spec.provider.infrastructureConfig.networks.zones', providerInfrastructureConfigNetworksZones.value)
      set(object, 'spec.provider.controlPlaneConfig.zone', providerControlPlaneConfigZone.value)
    }
    return normalizeShootManifest(object)
  })

  function setShootManifest (value) {
    initialManifest.value = value
    manifest.value = cloneDeep(value)
    dns.value = get(manifest.value, 'spec.dns', {})
  }

  function resetShootManifest () {
    setShootManifest({})
    resetShootName()
    resetProviderType()
    resetNetworkingType()
    resetAddons()
    resetMaintenance()
    resetHibernation()
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

  function resetShootName () {
    if (!shootName.value) {
      shootName.value = utils.shortRandomString(10)
    }
  }

  function getAnnotation (key, defaultValue) {
    return get(manifest.value, `metadata.annotations["${key}"]`, `${defaultValue}`)
  }

  function setAnnotation (key, value) {
    set(manifest.value, `metadata.annotations["${key}"]`, `${value}`)
  }

  function unsetAnnotation (key, value) {
    unset(manifest.value, `metadata.annotations["${key}"]`)
  }

  const shootCreationTimestamp = computed(() => {
    return get(manifest.value, 'metadata.creationTimestamp')
  })

  const isNewCluster = computed(() => {
    return !shootCreationTimestamp.value
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
    return get(manifest.value, 'spec.networking.nodes', defaultNodesCIDR.value)
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

  const providerControlPlaneConfigZone = computed(() => {
    const oldControlPlaneZone = get(initialManifest.value, 'spec.provider.controlPlaneConfig.zone')
    return getControlPlaneZone(
      providerWorkers.value,
      providerType.value,
      oldControlPlaneZone,
    )
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
  const providerInfrastructureConfigNetworksZones = computed(() => {
    const oldZonesNetworkConfiguration = get(initialManifest.value, 'spec.provider.infrastructureConfig.networks.zones')
    const maxNumberOfZones = size(allZones.value)
    const workerCIDR = networkingNodes.value
    const [existingShootWorkerCIDR, newShootWorkerCIDR] = !isNewCluster.value
      ? [workerCIDR, undefined]
      : [undefined, workerCIDR]
    return getZonesNetworkConfiguration(
      oldZonesNetworkConfiguration,
      providerWorkers.value,
      providerType.value,
      maxNumberOfZones,
      existingShootWorkerCIDR,
      newShootWorkerCIDR,
    )
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
    const visibleShootAddonList = filter(utils.shootAddonList, 'visible')
    for (const { name, enabled } of visibleShootAddonList) {
      defaultAddons[name] = { enabled }
    }
    addons.value = defaultAddons
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
  const noHibernationSchedule = computed({
    get () {
      return getAnnotation('dashboard.garden.sapcloud.io/no-hibernation-schedule', false)
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
      return get(manifest.value, 'spec.hibernation.schedules')
    },
    set (value) {
      set(manifest.value, 'spec.hibernation.schedules', value)
    },
  })

  function resetHibernationShedules () {
    const location = appStore.location
    const defaultHibernationSchedules = get(configStore.defaultHibernationSchedule, purpose.value)
    hibernationSchedules.value = map(defaultHibernationSchedules, schedule => ({ ...schedule, location }))
    noHibernationSchedule.value = false
  }

  function resetHibernation () {
    resetHibernationShedules()
  }

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
  const accessRestrictions = computed({
    get: getAccessRestrictions,
    set: setAccessRestrictions,
  })

  function getAccessRestrictions () {
    const getAccessRestriction = ({ key, input, options }) => {
      const value = getSeedSelectorMatchLabel(key, !!input?.inverted) === 'true'
      const accessRestrictionOptions = {}
      for (const { key, input } of options) {
        if (key) {
          const value = getAnnotation(key, !!input?.inverted) === 'true'
          accessRestrictionOptions[key] = {
            value: NAND(value, !!input?.inverted),
          }
        }
      }
      return {
        value: NAND(value, !!input?.inverted),
        options: accessRestrictionOptions,
      }
    }

    const accessRestrictions = {}
    for (const definition of accessRestrictionDefinitions.value) {
      const key = definition.key
      if (key) {
        accessRestrictions[key] = getAccessRestriction(definition)
      }
    }

    return accessRestrictions
  }

  function setAccessRestrictions (value) {
    const setAccessRestriction = ({ key, input, options: optionDefinitions }, accessRestriction) => {
      const accessRestrictionEnabled = NAND(accessRestriction.value, !!input?.inverted)
      if (accessRestrictionEnabled) {
        setSeedSelectorMatchLabel(key, 'true')
      } else {
        unsetSeedSelectorMatchLabel(key)
      }

      for (const optionDefinition of optionDefinitions) {
        const key = optionDefinition.key
        if (accessRestrictionEnabled) {
          const accessRestrictionOption = accessRestriction.options[key]
          const optionEnabled = NAND(accessRestrictionOption.value, !!input?.inverted)
          setAnnotation(key, optionEnabled)
        } else {
          unsetAnnotation(key)
        }
      }
    }

    for (const definition of accessRestrictionDefinitions.value) {
      const key = definition.key
      setAccessRestriction(definition, value[key])
    }
  }

  /* seedSelector */
  function getSeedSelectorMatchLabel (key, defaultValue) {
    get(manifest.value, `spec.seedSelector.matchLabels["${key}"]`, `${defaultValue}`)
  }

  function setSeedSelectorMatchLabel (key, value) {
    set(manifest.value, `spec.seedSelector.matchLabels["${key}"]`, `${value}`)
  }

  function unsetSeedSelectorMatchLabel (key, value) {
    unset(manifest.value, `spec.seedSelector.matchLabels["${key}"]`)
  }

  /*
   * Readonly Properties
   */

  const cloudProfiles = computed(() => {
    return cloudProfileStore.cloudProfilesByCloudProviderKind(providerType.value)
  })

  const cloudProfile = computed(() => {
    return cloudProfileStore.cloudProfileByName(cloudProfileName.value)
  })

  const isZonedCluster = computed(() => {
    return utils.isZonedCluster({
      cloudProviderKind: providerType.value,
      isNewCluster: isNewCluster.value,
    })
  })

  const seed = computed(() => {
    return seedStore.seedByName(seedName.value)
  })

  const allSeeds = computed(() => {
    return cloudProfileStore.seedsByCloudProfileName(cloudProfileName.value)
  })

  const isFailureToleranceTypeZoneSupported = computed(() => {
    const seeds = seedName.value
      ? [seed.value]
      : allSeeds.value
    return some(seeds, ({ data }) => data.zones?.length >= 3)
  })

  const allZones = computed(() => {
    return cloudProfileStore.zonesByCloudProfileNameAndRegion({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
    })
  })

  const usedZones = computed(() => {
    return uniq(flatMap(providerWorkers.value, 'zones'))
  })

  const unusedZones = computed(() => {
    return difference(allZones.value, usedZones.value)
  })

  const freeNetworks = computed(() => {
    return findFreeNetworks(
      providerInfrastructureConfigNetworksZones.value,
      networkingNodes.value,
      providerType.value,
      size(allZones.value),
    )
  })

  const zonesWithNetworkConfigInShoot = computed(() => {
    return map(providerInfrastructureConfigNetworksZones.value, 'name')
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

  const expiringWorkerGroups = computed(() => {
    return cloudProfileStore.expiringWorkerGroupsForShoot(providerWorkers.value, cloudProfileName.value, false)
  })

  const regionsWithSeed = computed(() => {
    return cloudProfileStore.regionsWithSeedByCloudProfileName(cloudProfileName.value)
  })

  const regionsWithoutSeed = computed(() => {
    return cloudProfileStore.regionsWithoutSeedByCloudProfileName(cloudProfileName.value)
  })

  const defaultNodesCIDR = computed(() => {
    return cloudProfileStore.getDefaultNodesCIDR({
      cloudProfileName: cloudProfileName.value,
    })
  })

  const infrastructureSecrets = computed(() => {
    return secretStore.infrastructureSecretsByCloudProfileName(cloudProfileName.value)
  })

  const sortedKubernetesVersions = computed(() => {
    return cloudProfileStore.sortedKubernetesVersions(cloudProfileName.value)
  })

  const kubernetesVersionIsNotLatestPatch = computed(() => {
    return cloudProfileStore.kubernetesVersionIsNotLatestPatch(kubernetesVersion.value, cloudProfileName.value)
  })

  const allPurposes = computed(() => {
    return utils.purposesForSecret(infrastructureSecret.value)
  })

  const allLoadBalancerProviderNames = computed(() => {
    return cloudProfileStore.loadBalancerProviderNamesByCloudProfileNameAndRegion({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
    })
  })

  const allLoadBalancerClassNames = computed(() => {
    return cloudProfileStore.loadBalancerClassNamesByCloudProfileName(cloudProfileName.value)
  })

  const partitionIDs = computed(() => {
    return cloudProfileStore.partitionIDsByCloudProfileNameAndRegion({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
    })
  })

  const firewallImages = computed(() => {
    return cloudProfileStore.firewallImagesByCloudProfileName(cloudProfileName.value)
  })

  const firewallSizes = computed(() => {
    const firewallSizes = cloudProfileStore.firewallSizesByCloudProfileNameAndRegion({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
    })
    return map(firewallSizes, 'name')
  })

  const allFirewallNetworks = computed(() => {
    return cloudProfileStore.firewallNetworksByCloudProfileNameAndPartitionId({
      cloudProfileName: cloudProfileName.value,
      partitionID: providerInfrastructureConfigPartitionID.value,
    })
  })

  const allFloatingPoolNames = computed(() => {
    return cloudProfileStore.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
      secretDomain: get(infrastructureSecret.value, 'data.domainName'),
    })
  })

  const accessRestrictionDefinitions = computed(() => {
    return cloudProfileStore.accessRestrictionDefinitionsByCloudProfileNameAndRegion({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
    })
  })

  const accessRestrictionNoItemsText = computed(() => {
    return cloudProfileStore.accessRestrictionNoItemsTextForCloudProfileNameAndRegion({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
    })
  })

  const selectedAccessRestrictions = computed(() => {
    const accessRestrictionList = []
    for (const definition of accessRestrictionDefinitions.value) {
      const {
        key,
        display: {
          visibleIf = false,
          title = key,
          description,
        },
        options: optionDefinitions,
      } = definition

      const accessRestriction = accessRestrictions.value[definition.key]
      if (visibleIf !== accessRestriction.value) {
        continue // skip
      }

      const accessRestrictionItemOptions = []
      for (const optionDefinition of optionDefinitions) {
        const {
          key,
          display: {
            visibleIf = false,
            title = key,
            description,
          },
        } = optionDefinition

        const accessRestrictionOption = accessRestriction.options[optionDefinition.key]
        if (accessRestrictionOption.value === !visibleIf) {
          continue // skip
        }

        accessRestrictionItemOptions.push({
          key,
          title,
          description,
        })
      }

      accessRestrictionList.push({
        key,
        title,
        description,
        options: accessRestrictionItemOptions,
      })
    }

    return accessRestrictionList
  })

  const allMachineTypes = computed(() => {
    return cloudProfileStore.machineTypesByCloudProfileName({
      cloudProfileName: cloudProfileName.value,
    })
  })

  const machineArchitectures = computed(() => {
    return cloudProfileStore.machineArchitecturesByCloudProfileNameAndRegion({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
    })
  })

  const volumeTypes = computed(() => {
    return cloudProfileStore.volumeTypesByCloudProfileName({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
    })
  })

  const machineImages = computed(() => {
    return cloudProfileStore.machineImagesByCloudProfileName(cloudProfileName.value)
  })

  const networkingTypes = computed(() => {
    return gardenerExtensionStore.networkingTypes
  })

  const showAllRegions = computed(() => {
    return configStore.seedCandidateDeterminationStrategy !== 'SameRegion'
  })

  const dnsProvidersWithPrimarySupport = computed(() => {
    const hasPrimarySupport = type => includes(gardenerExtensionStore.dnsProviderTypesWithPrimarySupport, type)
    return filter(dnsProviders.value, ({ type, secretName }) => hasPrimarySupport(type) && !!secretName)
  })

  return {
    shootManifest,
    isShootDirty,
    isNewCluster,
    shootName,
    shootNamespace,
    shootProjectName,
    purpose,
    isShootActionsDisabled,
    cloudProfileName,
    region,
    seedName,
    secretBindingName,
    infrastructureSecret,
    kubernetesVersion,
    kubernetesEnableStaticTokenKubeconfig,
    networkingType,
    networkingNodes,
    providerType,
    providerControlPlaneConfigLoadBalancerProviderName,
    providerControlPlaneConfigLoadBalancerClasses,
    providerControlPlaneConfigLoadBalancerClassNames,
    providerControlPlaneConfigZone,
    providerInfrastructureConfigFirewallImage,
    providerInfrastructureConfigFirewallNetworks,
    providerInfrastructureConfigFirewallSize,
    providerInfrastructureConfigFloatingPoolName,
    providerInfrastructureConfigNetworksZones,
    providerInfrastructureConfigPartitionID,
    providerInfrastructureConfigProjectID,
    providerWorkers,
    addons,
    maintenanceTimeWindowBegin,
    maintenanceTimeWindowEnd,
    maintenanceAutoUpdateKubernetesVersion,
    maintenanceAutoUpdateMachineImageVersion,
    hibernationSchedules,
    noHibernationSchedule,
    controlPlaneHighAvailability,
    controlPlaneHighAvailabilityFailureToleranceType,
    controlPlaneHighAvailabilityFailureToleranceTypeChangeAllowed,
    dns,
    dnsDomain,
    dnsProviders,
    dnsProviderIds,
    dnsPrimaryProvider,
    accessRestrictions,
    workerless,
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
    controlPlaneFailureToleranceType: controlPlaneHighAvailabilityFailureToleranceType,
    controlPlaneFailureToleranceTypeChangeAllowed: controlPlaneHighAvailabilityFailureToleranceTypeChangeAllowed,
    /* readonly */
    cloudProfiles,
    cloudProfile,
    isZonedCluster,
    seed,
    allSeeds,
    isFailureToleranceTypeZoneSupported,
    allZones,
    initialZones,
    usedZones,
    unusedZones,
    availableZones,
    maxAdditionalZones,
    expiringWorkerGroups,
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
    accessRestrictionDefinitions,
    accessRestrictionNoItemsText,
    selectedAccessRestrictions,
    allMachineTypes,
    machineArchitectures,
    volumeTypes,
    machineImages,
    networkingTypes,
    showAllRegions,
    dnsProvidersWithPrimarySupport,
    /* actions */
    setShootManifest,
    getAccessRestrictions,
    setAccessRestrictions,
    addProviderWorker,
    removeProviderWorker,
    addDnsProvider,
    patchDnsProvider,
    deleteDnsProvider,
    /* reset actions */
    resetShootManifest,
    resetProviderType,
    resetShootName,
    resetCloudProfileName,
    resetKubernetes,
    resetSecretBindingName,
    resetNetworkingType,
    resetProviderInfrastructureConfigPartitionID,
    resetProviderWorkers,
    resetAddons,
    resetMaintenanceTimeWindow,
    resetMaintenanceAutoUpdate,
    resetHibernationShedules,
    resetControlPlaneFailureToleranceType,
    resetDnsPrimaryProviderId,
  }
}
