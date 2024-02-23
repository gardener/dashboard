/* eslint-disable no-unused-vars */
//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineStore,
  acceptHMRUpdate,
} from 'pinia'
import {
  computed,
  ref,
  shallowRef,
  reactive,
  toRaw,
  watch,
} from 'vue'

import { useLogger } from '@/composables/useLogger'
import { useApi } from '@/composables/useApi'

import {
  getSpecTemplate,
  getZonesNetworkConfiguration,
  getControlPlaneZone,
} from '@/utils/createShoot'
import {
  purposesForSecret,
  isZonedCluster,
  shortRandomString,
} from '@/utils'

import { useAppStore } from '../app'
import { useAuthzStore } from '../authz'
import { useCloudProfileStore } from '../cloudProfile'
import { useConfigStore } from '../config'
import { useGardenerExtensionStore } from '../gardenerExtension'
import { useSecretStore } from '../secret'
import { useShootStagingStore } from '../shootStaging'

import { createShootResource } from './helper'

import {
  set,
  get,
  unset,
  head,
  omit,
  map,
  find,
  isEmpty,
  isEqual,
  cloneDeep,
  includes,
  intersection,
} from '@/lodash'

const useShootCreationStore = defineStore('shootCreation', () => {
  const logger = useLogger()
  const api = useApi()

  const appStore = useAppStore()
  const authzStore = useAuthzStore()
  const cloudProfileStore = useCloudProfileStore()
  const configStore = useConfigStore()
  const secretStore = useSecretStore()
  const gardenerExtensionStore = useGardenerExtensionStore()
  const shootStagingStore = useShootStagingStore()

  const state = reactive({
    name: undefined,
    kubernetesVersion: undefined,
    purpose: undefined,
    enableStaticTokenKubeconfig: false,
    infrastructureKind: undefined,
    cloudProfileName: undefined,
    secretBindingName: undefined,
    region: undefined,
    networkingType: undefined,
    floatingPoolName: undefined,
    loadBalancerProviderName: undefined,
    loadBalancerClasses: [],
    partitionID: undefined,
    projectID: undefined,
    firewallImage: undefined,
    firewallSize: undefined,
    firewallNetworks: undefined,
    accessRestrictions: [],
    workers: [],
    addons: {},
    maintenanceTimeWindow: {},
    maintenanceComponentUpdates: {},
    hibernationSchedules: [],
    noHibernationSchedule: undefined,
    controlPlaneFailureToleranceType: undefined,
  })

  /* getters */
  const cloudProfiles = computed(() => {
    return cloudProfileStore.cloudProfilesByCloudProviderKind(state.infrastructureKind)
  })

  const zones = computed(() => {
    return cloudProfileStore.zonesByCloudProfileNameAndRegion({
      cloudProfileName: state.cloudProfileName,
      region: state.region,
    })
  })

  const zonedCluster = computed(() => {
    return isZonedCluster({
      cloudProviderKind: state.infrastructureKind,
      isNewCluster: true,
    })
  })

  const defaultNodesCIDR = computed(() => {
    return cloudProfileStore.getDefaultNodesCIDR({
      cloudProfileName: state.cloudProfileName,
    })
  })

  const infrastructureSecrets = computed(() => {
    return secretStore.infrastructureSecretsByCloudProfileName(state.cloudProfileName)
  })

  const sortedKubernetesVersions = computed(() => {
    return cloudProfileStore.sortedKubernetesVersions(state.cloudProfileName)
  })

  const kubernetesVersionIsNotLatestPatch = computed(() => {
    return cloudProfileStore.kubernetesVersionIsNotLatestPatch(state.kubernetesVersion, state.cloudProfileName)
  })

  const purposes = computed(() => {
    return purposesForSecret(infrastructureSecret.value)
  })

  const regionsWithSeed = computed(() => {
    return cloudProfileStore.regionsWithSeedByCloudProfileName(state.cloudProfileName)
  })

  const regionsWithoutSeed = computed(() => {
    return cloudProfileStore.regionsWithoutSeedByCloudProfileName(state.cloudProfileName)
  })

  const allLoadBalancerProviderNames = computed(() => {
    return cloudProfileStore.loadBalancerProviderNamesByCloudProfileNameAndRegion({
      cloudProfileName: state.cloudProfileName,
      region: state.region,
    })
  })

  const allLoadBalancerClassNames = computed(() => {
    return cloudProfileStore.loadBalancerClassNamesByCloudProfileName(state.cloudProfileName)
  })

  const partitionIDs = computed(() => {
    return cloudProfileStore.partitionIDsByCloudProfileNameAndRegion({
      cloudProfileName: state.cloudProfileName,
      region: state.region,
    })
  })

  const firewallImages = computed(() => {
    return cloudProfileStore.firewallImagesByCloudProfileName(state.cloudProfileName)
  })

  const firewallSizes = computed(() => {
    const firewallSizes = cloudProfileStore.firewallSizesByCloudProfileNameAndRegion({
      cloudProfileName: state.cloudProfileName,
      region: state.region,
    })
    return map(firewallSizes, 'name')
  })

  const allFirewallNetworks = computed(() => {
    return cloudProfileStore.firewallNetworksByCloudProfileNameAndPartitionId({
      cloudProfileName: state.cloudProfileName,
      partitionID: state.partitionID,
    })
  })

  const allFloatingPoolNames = computed(() => {
    return cloudProfileStore.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({
      cloudProfileName: state.cloudProfileName,
      region: state.region,
      secretDomain: get(infrastructureSecret.value, 'data.domainName'),
    })
  })

  const accessRestrictionDefinitions = computed(() => {
    return cloudProfileStore.accessRestrictionDefinitionsByCloudProfileNameAndRegion({
      cloudProfileName: state.cloudProfileName,
      region: state.region,
    })
  })

  const networkingTypes = computed(() => {
    return gardenerExtensionStore.networkingTypes
  })

  const showAllRegions = computed(() => {
    return configStore.seedCandidateDeterminationStrategy !== 'SameRegion'
  })

  /* name */
  function setName (value) {
    state.name = value
  }

  const name = computed({
    get () {
      return state.name
    },
    set: setName,
  })

  function resetName () {
    if (!state.name) {
      setName(shortRandomString(10))
    }
  }

  /* kubernetesVersion */
  function setKubernetesVersion (value) {
    state.kubernetesVersion = value
  }

  const kubernetesVersion = computed({
    get () {
      return state.kubernetesVersion
    },
    set: setKubernetesVersion,
  })

  const defaultKubernetesVersion = computed(() => {
    const kubernetesVersion = cloudProfileStore.defaultKubernetesVersionForCloudProfileName(state.cloudProfileName)
    return get(kubernetesVersion, 'version')
  })

  function resetKubernetesVersion () {
    setKubernetesVersion(defaultKubernetesVersion.value)
  }

  /* purpose */
  function setPurpose (value) {
    state.purpose = includes(purposes.value, value)
      ? value
      : ''
  }
  const purpose = computed({
    get () {
      return state.purpose
    },
    set: setPurpose,
  })

  const defaultPurpose = computed(() => {
    return head(purposes.value)
  })

  function resetPurpose () {
    if (!state.purpose) {
      setPurpose(defaultPurpose.value)
    } else if (!includes(purposes.value, state.purpose)) {
      setPurpose()
    }
  }

  /* enableStaticTokenKubeconfig */
  function setEnableStaticTokenKubeconfig (value) {
    state.enableStaticTokenKubeconfig = !!value
  }

  const enableStaticTokenKubeconfig = computed({
    get () {
      return !!state.enableStaticTokenKubeconfig
    },
    set: setEnableStaticTokenKubeconfig,
  })

  /* infrastructureKind */
  function setInfrastructureKind (value) {
    state.infrastructureKind = value
    resetCloudProfileName()
  }

  const infrastructureKind = computed({
    get () {
      return state.infrastructureKind
    },
    set: setInfrastructureKind,
  })

  /* cloudProfileName */
  function setCloudProfileName (value) {
    state.cloudProfileName = value
    shootStagingStore.setCloudProfileName(value)
    resetName()
    resetKubernetesVersion()
    resetInfrastructureSecret()
    resetRegion()
    resetLoadBalancerProviderName()
    resetFloatingPoolName()
    resetLoadBalancerClassNames()
    resetFirewallImage()
    resetProjectID()
  }

  const cloudProfileName = computed({
    get () {
      return state.cloudProfileName
    },
    set: setCloudProfileName,
  })

  const defaultCloudProfileName = computed(() => {
    return get(head(cloudProfiles.value), 'metadata.name')
  })

  function resetCloudProfileName () {
    setCloudProfileName(defaultCloudProfileName.value)
  }

  /* secretBindingName */
  function setSecretBindingName (value) {
    state.secretBindingName = value
  }

  const secretBindingName = computed({
    get () {
      return state.secretBindingName
    },
    set: setSecretBindingName,
  })

  /* infrastructureSecret */
  function setInfrastructureSecret (value) {
    secretBindingName.value = get(value, 'metadata.name')
    resetPurpose()
  }

  const infrastructureSecret = computed({
    get () {
      return find(infrastructureSecrets.value, ['metadata.name', secretBindingName.value])
    },
    set: setInfrastructureSecret,
  })

  const defaultInfrastructureSecret = computed(() => {
    return head(infrastructureSecrets.value)
  })

  function resetInfrastructureSecret () {
    setInfrastructureSecret(defaultInfrastructureSecret.value)
  }

  /* region */
  function setRegion (value) {
    state.region = value
    resetPartitionID()
    resetFloatingPoolName()
    resetLoadBalancerProviderName()
  }

  const region = computed({
    get () {
      return state.region
    },
    set: setRegion,
  })

  const defaultRegion = computed(() => {
    return head(regionsWithSeed.value) ??
      showAllRegions.value
      ? head(regionsWithoutSeed.value)
      : undefined
  })

  function resetRegion () {
    setRegion(defaultRegion.value)
  }

  /* networkingType */
  function setNetworkingType (value) {
    state.networkingType = value
  }

  const networkingType = computed({
    get () {
      return state.networkingType
    },
    set: setNetworkingType,
  })

  const defaultNetworkingType = computed(() => {
    return head(gardenerExtensionStore.networkingTypes)
  })

  function resetNetworkingType () {
    setNetworkingType(defaultNetworkingType.value)
  }

  /* floatingPoolName */
  function setFloatingPoolName (value) {
    state.floatingPoolName = value
  }

  const floatingPoolName = computed({
    get () {
      return state.floatingPoolName
    },
    set: setFloatingPoolName,
  })

  const defaultFloatingPoolName = computed(() => {
    return head(allFloatingPoolNames.value)
  })

  function resetFloatingPoolName () {
    setFloatingPoolName(defaultFloatingPoolName.value)
  }

  /* loadBalancerProviderName */
  function setLoadBalancerProviderName (value) {
    state.loadBalancerProviderName = value
  }

  const loadBalancerProviderName = computed({
    get () {
      return state.loadBalancerProviderName
    },
    set: setLoadBalancerProviderName,
  })

  const defaultLoadBalancerProviderName = computed(() => {
    return head(allLoadBalancerProviderNames.value)
  })

  function resetLoadBalancerProviderName () {
    setLoadBalancerProviderName(defaultLoadBalancerProviderName.value)
  }

  /* loadBalancerClasseNames */
  function setLoadBalancerClassNames (value) {
    state.loadBalancerClassNames = intersection(allLoadBalancerClassNames.value, value)
  }

  const loadBalancerClassNames = computed({
    get () {
      return state.loadBalancerClassNames
    },
    set: setLoadBalancerClassNames,
  })

  const defaultLoadBalancerClassNames = computed(() => {
    const loadBalancerClassName = includes(allLoadBalancerClassNames.value, 'default')
      ? 'default'
      : head(allLoadBalancerClassNames.value)
    return loadBalancerClassName ? [loadBalancerClassName] : []
  })

  function resetLoadBalancerClassNames () {
    setLoadBalancerClassNames(defaultLoadBalancerClassNames.value)
  }

  /* loadBalancerClasses */
  function setLoadBalancerClasses (value) {
    setLoadBalancerClassNames(map(value, 'name'))
  }

  const loadBalancerClasses = computed({
    get () {
      return map(loadBalancerClassNames.value, name => ({ name }))
    },
    set: setLoadBalancerClasses,
  })

  /* partitionID */
  function setPartitionID (value) {
    state.partitionID = value
    resetFirewallSize()
    resetFirewallNetworks()
  }

  const partitionID = computed({
    get () {
      return state.partitionID
    },
    set: setPartitionID,
  })

  const defaultPartitionID = computed(() => {
    return head(partitionIDs.value)
  })

  function resetPartitionID () {
    setPartitionID(defaultPartitionID.value)
  }

  /* projectID */
  function setProjectID (value) {
    state.projectID = value
  }

  const projectID = computed({
    get () {
      return state.projectID
    },
    set: setProjectID,
  })

  const defaultProjectID = ref()

  function resetProjectID () {
    setProjectID(defaultProjectID.value)
  }

  /* firewallImage */
  function setFirewallImage (value) {
    state.firewallImage = value
  }

  const firewallImage = computed({
    get () {
      return state.firewallImage
    },
    set: setFirewallImage,
  })

  const defaultFirewallImage = computed(() => {
    return head(firewallImages.value)
  })

  function resetFirewallImage () {
    setFirewallImage(defaultFirewallImage.value)
  }

  /* firewallSize */
  function setFirewallSize (value) {
    state.firewallSize = value
  }

  const firewallSize = computed({
    get () {
      return state.firewallSize
    },
    set: setFirewallSize,
  })

  const defaultFirewallSize = computed(() => {
    return head(firewallSizes.value)
  })

  function resetFirewallSize () {
    setFirewallSize(defaultFirewallSize.value)
  }

  /* firewallNetworks */
  function setFirewallNetworks (value) {
    state.firewallNetworks = value
  }

  const firewallNetworks = computed({
    get () {
      return state.firewallNetworks
    },
    set: setFirewallNetworks,
  })

  const defaultFirewallNetworks = computed(() => {
    const firewallNetwork = find(allFirewallNetworks.value, ['key', 'internet'])
    return firewallNetwork
      ? [firewallNetwork.value]
      : undefined
  })

  function resetFirewallNetworks () {
    setFirewallNetworks(defaultFirewallNetworks.value)
  }

  /* k8sUpdates */
  function setK8sUpdates (value) {
    set(state, 'maintenanceComponentUpdates.k8sUpdates', !!value)
  }

  const k8sUpdates = computed({
    get () {
      return get(state, 'maintenanceComponentUpdates.k8sUpdates', false)
    },
    set: setK8sUpdates,
  })

  /* osUpdates */
  function setOsUpdates (value) {
    set(state, 'maintenanceComponentUpdates.osUpdates', !!value)
  }

  const osUpdates = computed({
    get () {
      return get(state, 'maintenanceComponentUpdates.osUpdates', false)
    },
    set: setOsUpdates,
  })

  function selectInfrastructure (value) {
    setInfrastructureKind(value)
  }

  const initialShootObject = shallowRef(null)
  const shootObject = ref(null)
  const editor = shallowRef(null)

  function isShootDirty (object) {
    return !isEqual(initialShootObject.value, object)
  }

  async function createShoot (data) {
    const namespace = data.metadata.namespace || authzStore.namespace
    await api.createShoot({ namespace, data })
    appStore.setSuccess('Cluster created')
  }

  function replaceShoot (value) {
    shootObject.value = value
  }

  function setShootResource () {
    const shootResource = getShootResource()
    replaceShoot(shootResource)
    return shootResource
  }

  function getShootResource () {
    const shootResource = cloneDeep(shootObject.value)

    const {
      infrastructureKind,
      cloudProfileName,
      region,
      networkingType,
      secretBindingName,
      floatingPoolName,
      loadBalancerProviderName,
      loadBalancerClassNames,
      partitionID,
      projectID,
      firewallImage,
      firewallSize,
      firewallNetworks,
      name,
      kubernetesVersion,
      purpose,
      enableStaticTokenKubeconfig,
      workers,
      addons,
      maintenanceTimeWindow,
      maintenanceComponentUpdates,
      hibernationSchedules,
      noHibernationSchedule,
      controlPlaneFailureToleranceType,
    } = toRaw(state)

    const oldInfrastructureKind = get(shootResource, 'spec.provider.type')
    if (oldInfrastructureKind !== infrastructureKind ||
      !shootResource.spec.provider.infrastructureConfig ||
      !shootResource.spec.provider.controlPlaneConfig) {
      // Infrastructure changed
      // or infrastructure template is empty (e.g. toggled workerless)
      set(shootResource, 'spec', getSpecTemplate(infrastructureKind, defaultNodesCIDR.value))
    }
    set(shootResource, 'spec.cloudProfileName', cloudProfileName)
    set(shootResource, 'spec.region', region)

    if (!shootStagingStore.workerless) {
      set(shootResource, 'spec.networking.type', networkingType)

      set(shootResource, 'spec.secretBindingName', secretBindingName)
      if (!isEmpty(floatingPoolName)) {
        set(shootResource, 'spec.provider.infrastructureConfig.floatingPoolName', floatingPoolName)
      }
      if (!isEmpty(loadBalancerProviderName)) {
        set(shootResource, 'spec.provider.controlPlaneConfig.loadBalancerProvider', loadBalancerProviderName)
      }
      if (!isEmpty(loadBalancerClassNames)) {
        const loadBalancerClasses = map(loadBalancerClassNames, name => ({ name }))
        set(shootResource, 'spec.provider.controlPlaneConfig.loadBalancerClasses', loadBalancerClasses)
      }
      if (!isEmpty(partitionID)) {
        set(shootResource, 'spec.provider.infrastructureConfig.partitionID', partitionID)
      }
      if (!isEmpty(projectID)) {
        set(shootResource, 'spec.provider.infrastructureConfig.projectID', projectID)
      }
      if (!isEmpty(firewallImage)) {
        set(shootResource, 'spec.provider.infrastructureConfig.firewall.image', firewallImage)
      }
      if (!isEmpty(firewallSize)) {
        set(shootResource, 'spec.provider.infrastructureConfig.firewall.size', firewallSize)
      }
      if (!isEmpty(firewallNetworks)) {
        set(shootResource, 'spec.provider.infrastructureConfig.firewall.networks', firewallNetworks)
      }
    }

    const dnsConfiguration = shootStagingStore.getDnsConfiguration()
    if (dnsConfiguration.domain || !isEmpty(dnsConfiguration.providers)) {
      set(shootResource, 'spec.dns', dnsConfiguration)
    } else {
      unset(shootResource, 'spec.dns')
    }

    const definitions = accessRestrictionDefinitions.value ?? []
    for (const definition of definitions) {
      const { key, input, options: optionDefinitions } = definition
      const { value, options } = state.accessRestrictions[key]
      const { inverted = false } = input

      const accessRestrictionEnabled = inverted ? !value : value
      if (accessRestrictionEnabled) {
        set(shootResource, ['spec', 'seedSelector', 'matchLabels', key], 'true')
      } else {
        unset(shootResource, ['spec', 'seedSelector', 'matchLabels', key])
      }

      for (const optionDefinition of optionDefinitions) {
        const { key, input } = optionDefinition
        const { value } = options[key]
        const { inverted = false } = input
        const optionEnabled = inverted ? !value : value
        if (accessRestrictionEnabled) {
          set(shootResource, ['metadata', 'annotations', key], `${optionEnabled}`)
        } else {
          unset(shootResource, ['metadata', 'annotations', key])
        }
      }
    }

    if (isEmpty(get(shootResource, 'spec.seedSelector.matchLabels'))) {
      unset(shootResource, 'spec.seedSelector.matchLabels')
    }
    if (isEmpty(get(shootResource, 'spec.seedSelector'))) {
      unset(shootResource, 'spec.seedSelector')
    }

    set(shootResource, 'metadata.name', name)
    set(shootResource, 'spec.kubernetes.version', kubernetesVersion)
    set(shootResource, 'spec.kubernetes.enableStaticTokenKubeconfig', enableStaticTokenKubeconfig)
    set(shootResource, 'spec.purpose', purpose)

    if (!shootStagingStore.workerless) {
      set(shootResource, 'spec.provider.workers', workers)

      const allZones = zones.value
      const oldZoneConfiguration = get(shootResource, 'spec.provider.infrastructureConfig.networks.zones', [])
      const nodeCIDR = get(shootResource, 'spec.networking.nodes', defaultNodesCIDR.value)
      const zonesNetworkConfiguration = getZonesNetworkConfiguration(oldZoneConfiguration, workers, infrastructureKind, allZones.length, undefined, nodeCIDR)
      if (zonesNetworkConfiguration) {
        set(shootResource, 'spec.provider.infrastructureConfig.networks.zones', zonesNetworkConfiguration)
      }

      const oldControlPlaneZone = get(shootResource, 'spec.provider.controlPlaneConfig.zone')
      const controlPlaneZone = getControlPlaneZone(workers, infrastructureKind, oldControlPlaneZone)
      if (controlPlaneZone) {
        set(shootResource, 'spec.provider.controlPlaneConfig.zone', controlPlaneZone)
      }

      set(shootResource, 'spec.addons', addons)
    }

    const autoUpdate = get(shootResource, 'spec.maintenance.autoUpdate', {})
    autoUpdate.kubernetesVersion = maintenanceComponentUpdates.k8sUpdates
    if (!shootStagingStore.workerless) {
      autoUpdate.machineImageVersion = maintenanceComponentUpdates.osUpdates
    }

    set(shootResource, 'spec.maintenance', {
      timeWindow: maintenanceTimeWindow,
      autoUpdate,
    })

    set(shootResource, 'spec.hibernation.schedules', hibernationSchedules)
    if (noHibernationSchedule) {
      set(shootResource, 'metadata.annotations["dashboard.garden.sapcloud.io/no-hibernation-schedule"]', 'true')
    } else {
      unset(shootResource, 'metadata.annotations["dashboard.garden.sapcloud.io/no-hibernation-schedule"]')
    }

    if (controlPlaneFailureToleranceType) {
      set(shootResource, 'spec.controlPlane.highAvailability.failureTolerance.type', controlPlaneFailureToleranceType)
    } else {
      unset(shootResource, 'spec.controlPlane')
    }

    return !shootStagingStore.workerless
      ? shootResource
      : omit(shootResource, [
        'spec.provider.infrastructureConfig',
        'spec.provider.controlPlaneConfig',
        'spec.provider.workers',
        'spec.addons',
        'spec.networking',
        'spec.secretBindingName',
        'spec.maintenance.autoUpdate.machineImageVersion',
      ])
  }

  function setShootResourceState () {
    const shootResource = cloneDeep(shootObject.value)

    const infrastructureKind = get(shootResource, 'spec.provider.type')
    state.infrastructureKind = infrastructureKind

    const cloudProfileName = get(shootResource, 'spec.cloudProfileName')
    const region = get(shootResource, 'spec.region')
    const networkingType = get(shootResource, 'spec.networking.type')
    const secretBindingName = get(shootResource, 'spec.secretBindingName')
    state.cloudProfileName = cloudProfileName
    state.region = region
    state.networkingType = networkingType
    state.secretBindingName = secretBindingName

    const floatingPoolName = get(shootResource, 'spec.provider.infrastructureConfig.floatingPoolName')
    const loadBalancerProviderName = get(shootResource, 'spec.provider.controlPlaneConfig.loadBalancerProvider')
    const loadBalancerClasses = get(shootResource, 'spec.provider.controlPlaneConfig.loadBalancerClasses')
    state.floatingPoolName = floatingPoolName
    state.loadBalancerProviderName = loadBalancerProviderName
    state.loadBalancerClasses = loadBalancerClasses
    state.loadBalancerClassNames = map(loadBalancerClasses, 'name')

    const partitionID = get(shootResource, 'spec.provider.infrastructureConfig.partitionID')
    const projectID = get(shootResource, 'spec.provider.infrastructureConfig.projectID')
    const firewallImage = get(shootResource, 'spec.provider.infrastructureConfig.firewall.image')
    const firewallSize = get(shootResource, 'spec.provider.infrastructureConfig.firewall.size')
    const firewallNetworks = get(shootResource, 'spec.provider.infrastructureConfig.firewall.networks')
    state.partitionID = partitionID
    state.projectID = projectID
    state.firewallImage = firewallImage
    state.firewallSize = firewallSize
    state.firewallNetworks = firewallNetworks

    const accessRestrictions = cloudProfileStore.accessRestrictionsForShootByCloudProfileNameAndRegion({
      shootResource,
      cloudProfileName,
      region,
    })
    state.accessRestrictions = cloneDeep(accessRestrictions)

    const begin = get(shootResource, 'spec.maintenance.timeWindow.begin')
    const end = get(shootResource, 'spec.maintenance.timeWindow.end')
    state.maintenanceTimeWindow = { begin, end }

    const k8sUpdates = get(shootResource, 'spec.maintenance.autoUpdate.kubernetesVersion', true)
    const osUpdates = get(shootResource, 'spec.maintenance.autoUpdate.machineImageVersion', true)
    state.maintenanceComponentUpdates = { k8sUpdates, osUpdates }

    const name = get(shootResource, 'metadata.name')
    const kubernetesVersion = get(shootResource, 'spec.kubernetes.version')
    const enableStaticTokenKubeconfig = get(shootResource, 'spec.kubernetes.enableStaticTokenKubeconfig')
    const purpose = get(shootResource, 'spec.purpose')
    state.name = name
    state.kubernetesVersion = kubernetesVersion
    state.enableStaticTokenKubeconfig = enableStaticTokenKubeconfig
    state.purpose = purpose
    const workers = get(shootResource, 'spec.provider.workers')
    state.workers = cloneDeep(workers)

    const addons = cloneDeep(get(shootResource, 'spec.addons', {}))
    state.addons = cloneDeep(addons)

    const hibernationSchedules = get(shootResource, 'spec.hibernation.schedules')
    const noHibernationSchedule = get(shootResource, 'metadata.annotations["dashboard.garden.sapcloud.io/no-hibernation-schedule"]', false)
    state.hibernationSchedules = hibernationSchedules
    state.noHibernationSchedule = noHibernationSchedule
  }

  function $reset () {
    const shootCreationStore = this
    const shootObject = createShootResource({
      logger,
      appStore,
      authzStore,
      configStore,
      secretStore,
      cloudProfileStore,
      gardenerExtensionStore,
    })
    shootCreationStore.$patch(state => {
      state.initialShootObject = shootObject
      state.shootObject = cloneDeep(shootObject)
    })
    editor.value = null
    shootStagingStore.workerless = false
  }

  watch(() => shootStagingStore.workerless, value => {
    if (!value && !infrastructureSecret.value && !networkingType.value) {
      // If worker required values missing, reset to defaults
      setCloudProfileName(state.cloudProfileName ?? defaultCloudProfileName.value)
      resetNetworkingType()
    }
  })

  return {
    editor,
    shootObject,
    isShootDirty,
    replaceShoot,
    createShoot,
    $reset,
    name,
    kubernetesVersion,
    purpose,
    enableStaticTokenKubeconfig,
    infrastructureKind,
    cloudProfileName,
    secretBindingName,
    region,
    networkingType,
    floatingPoolName,
    loadBalancerProviderName,
    loadBalancerClassNames,
    partitionID,
    projectID,
    firewallImage,
    firewallSize,
    firewallNetworks,
    k8sUpdates,
    osUpdates,
    cloudProfiles,
    zones,
    zonedCluster,
    defaultNodesCIDR,
    infrastructureSecrets,
    infrastructureSecret,
    sortedKubernetesVersions,
    purposes,
    kubernetesVersionIsNotLatestPatch,
    accessRestrictionDefinitions,
    regionsWithSeed,
    regionsWithoutSeed,
    showAllRegions,
    networkingTypes,
    allFloatingPoolNames,
    allLoadBalancerClassNames,
    allLoadBalancerProviderNames,
    partitionIDs,
    firewallImages,
    firewallSizes,
    allFirewallNetworks,
    getShootResource,
    setShootResource,
    setShootResourceState,
    selectInfrastructure,
  }
})

export default useShootCreationStore

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useShootCreationStore, import.meta.hot))
}
