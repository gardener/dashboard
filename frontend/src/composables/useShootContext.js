//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  ref,
  shallowRef,
  computed,
  reactive,
  toRef,
  watch,
  inject,
  provide,
} from 'vue'

import { useAuthzStore } from '@/store/authz'
import { useConfigStore } from '@/store/config'
import { useCloudProfileStore } from '@/store/cloudProfile'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useProjectStore } from '@/store/project'
import { useCredentialStore } from '@/store/credential'
import { useAppStore } from '@/store/app'
import { useSeedStore } from '@/store/seed'

import { cleanup } from '@/composables/helper'
import { useLogger } from '@/composables/useLogger'
import { createShootHelperComposable } from '@/composables/useShootHelper'
import { useShootMetadata } from '@/composables/useShootMetadata'
import { useShootAccessRestrictions } from '@/composables/useShootAccessRestrictions'

import {
  scheduleEventsFromCrontabBlocks,
  crontabBlocksFromScheduleEvents,
} from '@/utils/hibernationSchedule'
import {
  findFreeNetworks,
  getControlPlaneZone,
  getSpecTemplate,
  getZonesNetworkConfiguration,
} from '@/utils/shoot'
import { v4 as uuidv4 } from '@/utils/uuid'
import {
  shortRandomString,
  shootAddonList,
  randomMaintenanceBegin,
  maintenanceWindowWithBeginAndTimezone,
} from '@/utils'

import { useShootDns } from './useShootDns'

import size from 'lodash/size'
import isEmpty from 'lodash/isEmpty'
import isEqual from 'lodash/isEqual'
import uniq from 'lodash/uniq'
import includes from 'lodash/includes'
import cloneDeep from 'lodash/cloneDeep'
import difference from 'lodash/difference'
import filter from 'lodash/filter'
import find from 'lodash/find'
import head from 'lodash/head'
import unset from 'lodash/unset'
import flatMap from 'lodash/flatMap'
import keyBy from 'lodash/keyBy'
import map from 'lodash/map'
import has from 'lodash/has'
import set from 'lodash/set'
import get from 'lodash/get'

export function createShootContextComposable (options = {}) {
  const {
    logger = useLogger(),
    appStore = useAppStore(),
    authzStore = useAuthzStore(),
    cloudProfileStore = useCloudProfileStore(),
    configStore = useConfigStore(),
    gardenerExtensionStore = useGardenerExtensionStore(),
    projectStore = useProjectStore(),
    credentialStore = useCredentialStore(),
    seedStore = useSeedStore(),
  } = options

  function normalizeManifest (value) {
    const object = Object.assign({
      apiVersion: 'core.gardener.cloud/v1beta1',
      kind: 'Shoot',
    }, value)
    if (workerless.value) {
      unset(object, ['spec', 'provider', 'infrastructureConfig'])
      unset(object, ['spec', 'provider', 'controlPlaneConfig'])
      unset(object, ['spec', 'provider', 'workers'])
      unset(object, ['spec', 'addons'])
      unset(object, ['spec', 'networking'])
      unset(object, ['spec', 'secretBindingName'])
      unset(object, ['spec', 'credentialsBindingName'])
      unset(object, ['spec', 'maintenance', 'autoUpdate', 'machineImageVersion'])
    }
    return cleanup(object)
  }

  /* initial manifest */
  const initialManifest = shallowRef(null)

  const normalizedInitialManifest = computed(() => {
    const object = cloneDeep(initialManifest.value)
    return normalizeManifest(object)
  })

  const initialZones = computed(() => {
    const workers = get(initialManifest.value, ['spec', 'provider', 'workers'])
    return uniq(flatMap(workers, 'zones'))
  })

  const initialProviderInfrastructureConfigNetworksZones = computed(() => {
    return get(initialManifest.value, ['spec', 'provider', 'infrastructureConfig', 'networks', 'zones'])
  })

  /* manifest */
  const manifest = ref({})

  const normalizedManifest = computed(() => {
    const object = cloneDeep(manifest.value)
    set(object, ['spec', 'hibernation', 'schedules'], hibernationSchedules.value)
    if (!workerless.value) {
      set(object, ['spec', 'provider', 'infrastructureConfig', 'networks', 'zones'], providerInfrastructureConfigNetworksZones.value)
      set(object, ['spec', 'provider', 'controlPlaneConfig', 'zone'], providerControlPlaneConfigZone.value)
    }
    return normalizeManifest(object)
  })

  function setShootManifest (value) {
    initialManifest.value = value
    manifest.value = cloneDeep(initialManifest.value)
    hibernationSchedules.value = get(manifest.value, ['spec', 'hibernation', 'schedules'], [])
    if (shootCreationTimestamp.value) {
      providerState.workerless = isEmpty(providerWorkers.value)
    }
  }

  function createShootManifest (options) {
    manifest.value = {
      metadata: {
        name: get(options, ['names'], shortRandomString(10)),
        namespace: get(options, ['namespace'], authzStore.namespace),
      },
    }
    hibernationSchedules.value = []
    workerless.value = get(options, ['workerless'], false)
    const defaultProviderType = head(cloudProfileStore.sortedProviderTypeList)
    providerType.value = get(options, ['providerType'], defaultProviderType)
    resetMaintenanceAutoUpdate()
    resetMaintenanceTimeWindow()
    initialManifest.value = cloneDeep(normalizedManifest.value)
  }

  const isShootDirty = computed(() => {
    return !isEqual(normalizedManifest.value, normalizedInitialManifest.value)
  })

  /* metadata */
  const {
    shootNamespace,
    shootName,
    shootProjectName,
    shootCreationTimestamp,
    isNewCluster,
    getShootAnnotation,
    setShootAnnotation,
    unsetShootAnnotation,
  } = useShootMetadata(manifest, {
    projectStore,
  })

  /* seedName */
  const seedName = computed(() => {
    return get(manifest.value, ['spec', 'seedName'])
  })

  /* kubernetes */
  const kubernetesVersion = computed({
    get () {
      return get(manifest.value, ['spec', 'kubernetes', 'version'])
    },
    set (value) {
      set(manifest.value, ['spec', 'kubernetes', 'version'], value)
    },
  })

  function resetKubernetesVersion () {
    const kubernetesVersions = map(cloudProfileStore.sortedKubernetesVersions(cloudProfileRef.value), 'version')
    if (!kubernetesVersion.value || !includes(kubernetesVersions, kubernetesVersion.value)) {
      const defaultKubernetesVersionDescriptor = cloudProfileStore.defaultKubernetesVersionForCloudProfileRef(cloudProfileRef.value)
      kubernetesVersion.value = get(defaultKubernetesVersionDescriptor, ['version'])
    }
  }

  /* cloudProfileRef */
  const cloudProfileRef = computed({
    get () {
      return get(manifest.value, ['spec', 'cloudProfile'])
    },
    set (value) {
      set(manifest.value, ['spec', 'cloudProfile'], value)
      resetCloudProfileDependendValues()
    },
  })

  function resetCloudProfileDependendValues () {
    resetNetworkingType()
    resetKubernetesVersion()
    resetBindingName()
    resetRegion()
    resetProviderControlPlaneConfigLoadBalancerClasses()
    resetProviderInfrastructureConfigProjectID()
    resetProviderInfrastructureConfigFirewallImage()
  }

  /* secretBindingName */
  const secretBindingName = computed({
    get () {
      return get(manifest.value, ['spec', 'secretBindingName'])
    },
    set (value) {
      set(manifest.value, ['spec', 'secretBindingName'], value)
      unset(manifest.value, ['spec', 'credentialsBindingName'])
      resetPurpose()
    },
  })

  const credentialsBindingName = computed({
    get () {
      return get(manifest.value, ['spec', 'credentialsBindingName'])
    },
    set (value) {
      set(manifest.value, ['spec', 'credentialsBindingName'], value)
      unset(manifest.value, ['spec', 'secretBindingName'])
      resetPurpose()
    },
  })

  const infrastructureBinding = computed({
    get () {
      if (secretBindingName.value) {
        return find(infrastructureBindings.value, { kind: 'SecretBinding', metadata: { name: secretBindingName.value } })
      }
      if (credentialsBindingName.value) {
        return find(infrastructureBindings.value, { kind: 'CredentialsBinding', metadata: { name: credentialsBindingName.value } })
      }
      return undefined
    },
    set (value) {
      if (value?.kind === 'CredentialsBinding') {
        credentialsBindingName.value = get(value, ['metadata', 'name'])
      }
      if (value?.kind === 'SecretBinding') {
        secretBindingName.value = get(value, ['metadata', 'name'])
      }
    },
  })

  function resetBindingName () {
    infrastructureBinding.value = head(infrastructureBindings.value)
  }

  /* networking */
  const networkingNodes = computed(() => {
    return get(manifest.value, ['spec', 'networking', 'nodes'])
  })

  const networkingType = computed({
    get () {
      return get(manifest.value, ['spec', 'networking', 'type'])
    },
    set (value) {
      set(manifest.value, ['spec', 'networking', 'type'], value)
    },
  })

  function resetNetworkingType () {
    if (!networkingType.value) {
      networkingType.value = head(gardenerExtensionStore.networkingTypes)
    }
  }

  /* region */
  const region = computed({
    get () {
      return get(manifest.value, ['spec', 'region'])
    },
    set (value) {
      set(manifest.value, ['spec', 'region'], value)
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
      return get(manifest.value, ['spec', 'purpose'])
    },
    set (value) {
      set(manifest.value, ['spec', 'purpose'], includes(allPurposes.value, value) ? value : '')
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
  const providerState = reactive({
    workerless: false,
  })

  const providerType = computed({
    get () {
      return get(manifest.value, ['spec', 'provider', 'type'])
    },
    set (value) {
      set(manifest.value, ['spec', 'provider', 'type'], value)
      applySpecTemplate(defaultCloudProfileRef.value)
      cloudProfileRef.value = defaultCloudProfileRef.value
    },
  })

  function applySpecTemplate (cloudProfileRef) {
    const {
      kubernetes,
      networking,
      provider,
    } = getSpecTemplate(providerType.value, cloudProfileStore.getDefaultNodesCIDR(cloudProfileRef))
    set(manifest.value, ['spec', 'provider', 'infrastructureConfig'], provider.infrastructureConfig)
    set(manifest.value, ['spec', 'provider', 'controlPlaneConfig'], provider.controlPlaneConfig)
    set(manifest.value, ['spec', 'networking'], networking)
    set(manifest.value, ['spec', 'kubernetes'], kubernetes)
  }

  const providerControlPlaneConfigZone = computed({
    get () {
      const value = get(manifest.value, ['spec', 'provider', 'controlPlaneConfig', 'zone'])
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
        set(manifest.value, ['spec', 'provider', 'controlPlaneConfig', 'zone'], value)
      } else {
        unset(manifest.value, ['spec', 'provider', 'controlPlaneConfig', 'zone'])
      }
    },
  })

  const providerControlPlaneConfigLoadBalancerProviderName = computed({
    get () {
      return get(manifest.value, ['spec', 'provider', 'controlPlaneConfig', 'loadBalancerProvider'])
    },
    set (value) {
      set(manifest.value, ['spec', 'provider', 'controlPlaneConfig', 'loadBalancerProvider'], value)
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
      return get(manifest.value, ['spec', 'provider', 'controlPlaneConfig', 'loadBalancerClasses'])
    },
    set (value) {
      set(manifest.value, ['spec', 'provider', 'controlPlaneConfig', 'loadBalancerClasses'], value)
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
      return get(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'partitionID'])
    },
    set (value) {
      set(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'partitionID'], value)
      resetProviderInfrastructureConfigFirewallSize()
      resetProviderInfrastructureConfigFirewallNetworks()
    },
  })

  function resetProviderInfrastructureConfigPartitionID () {
    providerInfrastructureConfigPartitionID.value = head(partitionIDs.value)
  }

  const allFirewallNetworks = computed(() => {
    return cloudProfileStore.firewallNetworksByCloudProfileRefAndPartitionId({
      cloudProfileRef: cloudProfileRef.value,
      partitionID: providerInfrastructureConfigPartitionID.value,
    })
  })

  const providerInfrastructureConfigProjectID = computed({
    get () {
      return get(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'projectID'])
    },
    set (value) {
      set(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'projectID'], value)
    },
  })

  function resetProviderInfrastructureConfigProjectID () {
    providerInfrastructureConfigProjectID.value = undefined
  }

  const providerInfrastructureConfigFloatingPoolName = computed({
    get () {
      return get(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'floatingPoolName'])
    },
    set (value) {
      set(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'floatingPoolName'], value)
    },
  })

  function resetProviderInfrastructureConfigFloatingPoolName () {
    providerInfrastructureConfigFloatingPoolName.value = head(allFloatingPoolNames.value)
  }

  const providerInfrastructureConfigFirewallImage = computed({
    get () {
      return get(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'firewall', 'image'])
    },
    set (value) {
      set(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'firewall', 'image'], value)
    },
  })

  function resetProviderInfrastructureConfigFirewallImage () {
    providerInfrastructureConfigFirewallImage.value = head(firewallImages.value)
  }

  const providerInfrastructureConfigFirewallSize = computed({
    get () {
      return get(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'firewall', 'size'])
    },
    set (value) {
      set(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'firewall', 'size'], value)
    },
  })

  function resetProviderInfrastructureConfigFirewallSize () {
    providerInfrastructureConfigFirewallSize.value = head(firewallSizes.value)
  }

  const providerInfrastructureConfigFirewallNetworks = computed({
    get () {
      return get(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'firewall', 'networks'])
    },
    set (value) {
      set(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'firewall', 'networks'], value)
    },
  })

  function resetProviderInfrastructureConfigFirewallNetworks () {
    const internetFirewallNetwork = find(allFirewallNetworks.value, ['key', 'internet'])
    providerInfrastructureConfigFirewallNetworks.value = internetFirewallNetwork
      ? [internetFirewallNetwork.value]
      : undefined
  }

  const workerless = computed({
    get () {
      return providerState.workerless
    },
    set (value) {
      if (isNewCluster.value && providerState.workerless !== value) {
        providerState.workerless = value
      }
    },
  })

  watch(workerless, value => {
    if (value || !cloudProfileRef.value) {
      return
    }
    if (!networkingType.value || (!secretBindingName.value && !credentialsBindingName.value)) {
      // If worker required values missing (navigated to overview tab from yaml), reset to defaults
      applySpecTemplate(cloudProfileRef.value)
      resetCloudProfileDependendValues()
    }
  }, {
    flush: 'sync',
  })

  const providerWorkers = computed({
    get () {
      return get(manifest.value, ['spec', 'provider', 'workers'], [])
    },
    set (value = []) {
      set(manifest.value, ['spec', 'provider', 'workers'], value)
      resetAddons()
    },
  })

  function resetProviderWorkers () {
    providerWorkers.value = providerState.workerless
      ? []
      : [generateProviderWorker(availableZones.value)]
  }

  function addProviderWorker () {
    providerWorkers.value = [
      ...providerWorkers.value,
      generateProviderWorker(usedZones.value),
    ]
  }

  function removeProviderWorker (index) {
    providerWorkers.value = filter(providerWorkers.value, (_, i) => i !== index)
  }

  function generateProviderWorker (zones) {
    const { id, isNew, ...worker } = cloudProfileStore.generateWorker(
      !isEmpty(zones)
        ? zones
        : availableZones.value,
      cloudProfileRef.value,
      region.value,
      kubernetesVersion.value,
    )
    Object.defineProperty(worker, 'isNew', { value: isNew })
    return worker
  }

  /* providerInfrastructureConfigNetworksZones */
  const providerInfrastructureConfigNetworksZones = computed({
    get () {
      const value = get(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'networks', 'zones'])
      const args = shootCreationTimestamp.value
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
      set(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'networks', 'zones'], value)
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

  const isZonedCluster = computed(() => {
    switch (providerType.value) {
      case 'azure':
        if (isNewCluster.value) {
          return true // new clusters are always created as zoned clusters by the dashboard
        }
        return get(manifest.value, ['spec', 'provider', 'infrastructureConfig', 'zoned'], false)
      case 'metal':
        return false // metal clusters do not support zones for worker groups
      case 'local':
        return false // local development provider does not support zones
      default:
        return true
    }
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
      return get(manifest.value, ['spec', 'addons'], {})
    },
    set (value) {
      set(manifest.value, ['spec', 'addons'], value)
    },
  })

  function resetAddons () {
    const defaultAddons = {}
    if (!providerState.workerless) {
      for (const { name, enabled } of visibleAddonDefinitionList.value) {
        set(defaultAddons, [name], { enabled })
      }
    }
    addons.value = defaultAddons
  }

  const visibleAddonDefinitionList = computed(() => {
    return filter(shootAddonList, 'visible')
  })

  const addonDefinitionList = computed(() => {
    return filter(shootAddonList, ({ name, visible }) => visible || has(addons.value, name))
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
      return get(manifest.value, ['spec', 'maintenance', 'timeWindow', 'begin'])
    },
    set (value) {
      set(manifest.value, ['spec', 'maintenance', 'timeWindow', 'begin'], value)
    },
  })

  const maintenanceTimeWindowEnd = computed({
    get () {
      return get(manifest.value, ['spec', 'maintenance', 'timeWindow', 'end'])
    },
    set (value) {
      set(manifest.value, ['spec', 'maintenance', 'timeWindow', 'end'], value)
    },
  })

  function resetMaintenanceTimeWindow () {
    const maintenanceBegin = randomMaintenanceBegin()
    const timeWindow = maintenanceWindowWithBeginAndTimezone(maintenanceBegin, appStore.timezone)
    maintenanceTimeWindowBegin.value = timeWindow.begin
    maintenanceTimeWindowEnd.value = timeWindow.end
  }

  /* maintenanceAutoUpdateKubernetesVersion */
  const maintenanceAutoUpdateKubernetesVersion = computed({
    get () {
      return get(manifest.value, ['spec', 'maintenance', 'autoUpdate', 'kubernetesVersion'], true)
    },
    set (value) {
      set(manifest.value, ['spec', 'maintenance', 'autoUpdate', 'kubernetesVersion'], value)
    },
  })

  const maintenanceAutoUpdateMachineImageVersion = computed({
    get () {
      return get(manifest.value, ['spec', 'maintenance', 'autoUpdate', 'machineImageVersion'], true)
    },
    set (value) {
      set(manifest.value, ['spec', 'maintenance', 'autoUpdate', 'machineImageVersion'], value)
    },
  })

  function resetMaintenanceAutoUpdate () {
    maintenanceAutoUpdateKubernetesVersion.value = true
    maintenanceAutoUpdateMachineImageVersion.value = true
  }

  /* hibernation */
  const noHibernationSchedules = computed({
    get () {
      return getShootAnnotation('dashboard.garden.sapcloud.io/no-hibernation-schedule', 'false') === 'true'
    },
    set (value) {
      if (value) {
        setShootAnnotation('dashboard.garden.sapcloud.io/no-hibernation-schedule', 'true')
      } else {
        unsetShootAnnotation('dashboard.garden.sapcloud.io/no-hibernation-schedule')
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
      return get(manifest.value, ['spec', 'controlPlane', 'highAvailability', 'failureTolerance', 'type'])
    },
    set (value) {
      if (value) {
        set(manifest.value, ['spec', 'controlPlane', 'highAvailability', 'failureTolerance', 'type'], value)
      } else {
        unset(manifest.value, ['spec', 'controlPlane', 'highAvailability'])
      }
    },
  })

  const controlPlaneHighAvailabilityFailureToleranceTypeChangeAllowed = computed(() => {
    const oldControlPlaneFailureToleranceType = get(normalizedInitialManifest.value, ['spec', 'controlPlane', 'highAvailability', 'failureTolerance', 'type'])
    return isNewCluster.value || !oldControlPlaneFailureToleranceType
  })

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
  const {
    dnsDomain,
    dnsPrimaryProviderType,
    dnsPrimaryProviderSecretName,
    dnsServiceExtensionProviders,
    hasDnsServiceExtensionProviderForCustomDomain,
    addDnsServiceExtensionProviderForCustomDomain,
    addDnsServiceExtensionProvider,
    deleteDnsServiceExtensionProvider,
    getDnsServiceExtensionResourceName,
    resetDnsPrimaryProvider,
    forceMigrateSyncDnsProvidersToFalse,
    addExtensionDnsProviderResourceRef,
    setResource,
    deleteResource,
    getResourceRefName,
  } = useShootDns(manifest, {
    gardenerExtensionStore,
    credentialStore,
  })

  /* accessRestrictions */
  const {
    getAccessRestrictionValue,
    setAccessRestrictionValue,
    getAccessRestrictionOptionValue,
    setAccessRestrictionOptionValue,
    getAccessRestrictionPatchData,
  } = useShootAccessRestrictions(manifest, {
    cloudProfileStore,
  })

  const {
    cloudProfiles,
    defaultCloudProfileRef,
    cloudProfile,
    seed,
    seeds,
    isFailureToleranceTypeZoneSupported,
    allZones,
    defaultNodesCIDR,
    infrastructureBindings,
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
    accessRestrictionDefinitions,
    accessRestrictionNoItemsText,
    allMachineTypes,
    machineArchitectures,
    volumeTypes,
    machineImages,
    networkingTypes,
    showAllRegions,
  } = createShootHelperComposable(manifest, {
    cloudProfileStore,
    configStore,
    gardenerExtensionStore,
    credentialStore,
    seedStore,
  })

  /* watches */
  watch(isFailureToleranceTypeZoneSupported, value => {
    if (controlPlaneHighAvailabilityFailureToleranceTypeChangeAllowed.value) {
      if (!value) {
        if (controlPlaneHighAvailabilityFailureToleranceType.value === 'zone') {
          controlPlaneHighAvailabilityFailureToleranceType.value = 'node'
        }
      } else {
        if (controlPlaneHighAvailabilityFailureToleranceType.value === 'node') {
          controlPlaneHighAvailabilityFailureToleranceType.value = 'zone'
        }
      }
    }
  }, {
    flush: 'sync',
  })

  return {
    /* manifest */
    shootManifest: normalizedManifest,
    setShootManifest,
    createShootManifest,
    isShootDirty,
    /* metadata */
    shootName,
    shootNamespace,
    shootProjectName,
    isNewCluster,
    purpose,
    isShootActionsDisabled,
    cloudProfileRef,
    region,
    seedName,
    /* secretBindingName */
    infrastructureBinding,
    /* kubernetes */
    kubernetesVersion,
    /* networking */
    networkingType,
    networkingNodes,
    /* provider */
    providerType,
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
    initialProviderInfrastructureConfigNetworksZones,
    providerInfrastructureConfigPartitionID,
    providerInfrastructureConfigProjectID,
    /* provider - workers */
    providerWorkers,
    addProviderWorker,
    removeProviderWorker,
    workerless,
    usedZones,
    unusedZones,
    availableZones,
    isZonedCluster,
    /* hibernation */
    maintenanceTimeWindowBegin,
    maintenanceTimeWindowEnd,
    maintenanceAutoUpdateKubernetesVersion,
    maintenanceAutoUpdateMachineImageVersion,
    /* hibernation */
    hibernationSchedules,
    hibernationSchedulesError,
    hibernationScheduleEvents,
    getHibernationScheduleEvent,
    addHibernationScheduleEvent,
    removeHibernationScheduleEvent,
    noHibernationSchedules,
    /* controlPlane - highAvailability */
    controlPlaneHighAvailability,
    controlPlaneHighAvailabilityFailureToleranceType,
    controlPlaneHighAvailabilityFailureToleranceTypeChangeAllowed,
    /* dns */
    dnsDomain,
    dnsPrimaryProviderType,
    dnsPrimaryProviderSecretName,
    dnsServiceExtensionProviders,
    hasDnsServiceExtensionProviderForCustomDomain,
    addDnsServiceExtensionProviderForCustomDomain,
    addDnsServiceExtensionProvider,
    deleteDnsServiceExtensionProvider,
    getDnsServiceExtensionResourceName,
    resetDnsPrimaryProvider,
    forceMigrateSyncDnsProvidersToFalse,
    addExtensionDnsProviderResourceRef,
    setResource,
    deleteResource,
    getResourceRefName,
    /* accessRestrictions */
    getAccessRestrictionValue,
    setAccessRestrictionValue,
    getAccessRestrictionOptionValue,
    setAccessRestrictionOptionValue,
    getAccessRestrictionPatchData,
    accessRestrictionDefinitions,
    accessRestrictionNoItemsText,
    /* addons */
    addons,
    getAddonEnabled,
    setAddonEnabled,
    addonDefinitions,
    addonDefinitionList,
    visibleAddonDefinitionList,
    /* helper */
    cloudProfiles,
    cloudProfile,
    seed,
    seeds,
    isFailureToleranceTypeZoneSupported,
    allZones,
    initialZones,
    maxAdditionalZones,
    defaultNodesCIDR,
    infrastructureBindings,
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
  }
}

export function useShootContext () {
  return inject('shoot-context', null)
}

export function useProvideShootContext (options) {
  const composable = createShootContextComposable(options)
  provide('shoot-context', composable)
  return composable
}
