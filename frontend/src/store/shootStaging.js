//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import {
  computed,
  reactive,
} from 'vue'

import { v4 as uuidv4 } from '@/utils/uuid'

import { useGardenerExtensionStore } from './gardenerExtension'
import { useSecretStore } from './secret'

import {
  has,
  get,
  set,
  head,
  map,
  keyBy,
  omit,
  filter,
  includes,
  isEmpty,
  find,
} from '@/lodash'

// helper
function getId (object) {
  return get(object, 'id', null)
}

function notYetCreated (object) {
  return !get(object, 'metadata.creationTimestamp')
}

export const useShootStagingStore = defineStore('shootStaging', () => {
  const gardenerExtensionStore = useGardenerExtensionStore()
  const secretStore = useSecretStore()

  // state
  const state = reactive({
    metadata: {},
    dnsDomain: null,
    dnsProviders: {},
    dnsProviderIds: [],
    dnsPrimaryProviderId: null,
    cloudProfileName: null,
    controlPlaneFailureToleranceType: null,
    initialControlPlaneFailureToleranceType: null,
    seedName: null,
    workerless: null,
  })

  const dnsDomain = computed(() => {
    return state.dnsDomain
  })

  const dnsProviderIds = computed(() => {
    return state.dnsProviderIds
  })

  const cloudProfileName = computed(() => {
    return state.cloudProfileName
  })

  const seedName = computed(() => {
    return state.seedName
  })

  const workerless = computed(() => {
    return state.workerless
  })

  const clusterIsNew = computed(() => {
    return notYetCreated(state)
  })

  const dnsProviderTypes = computed(() => {
    return map(gardenerExtensionStore.sortedDnsProviderList, 'type')
  })

  const dnsProviderTypesWithPrimarySupport = computed(() => {
    return map(filter(gardenerExtensionStore.sortedDnsProviderList, 'primary'), 'type')
  })

  const dnsProviders = computed(() => {
    return state.dnsProviders
  })

  const dnsProvidersWithPrimarySupport = computed(() => {
    const types = dnsProviderTypesWithPrimarySupport.value
    return filter(dnsProviders.value, ({ type, secretName }) => {
      return includes(types, type) && !!secretName
    })
  })

  const dnsPrimaryProvider = computed(() => {
    return state.dnsProviders[state.dnsPrimaryProviderId]
  })

  const dnsDefaultPrimaryProviderId = computed(() => {
    const defaultPrimaryProvider = head(dnsProvidersWithPrimarySupport.value)
    return getId(defaultPrimaryProvider)
  })

  const controlPlaneFailureToleranceTypeChangeAllowed = computed(() => {
    return clusterIsNew.value || !state.initialControlPlaneFailureToleranceType
  })

  const controlPlaneFailureToleranceType = computed(() => {
    return state.controlPlaneFailureToleranceType
  })

  // actions
  function getDnsProviderSecrets (type) {
    return secretStore.dnsSecretsByProviderKind(type)
  }

  function findDnsProviderSecret (type, secretName) {
    const secrets = getDnsProviderSecrets(type)
    return find(secrets, ['metadata.secretRef.name', secretName])
  }

  function providerById (id) {
    const {
      type,
      secretName,
      excludeDomains,
      includeDomains,
      excludeZones,
      includeZones,
    } = state.dnsProviders[id]
    const primary = state.dnsPrimaryProviderId === id
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
  }

  function getDnsConfiguration () {
    const dns = {
      providers: map(state.dnsProviderIds, providerById),
    }
    const domain = state.dnsDomain
    if (domain && domain.length) {
      dns.domain = domain
    }
    return dns
  }

  function setDnsDomain (value) {
    state.dnsDomain = value
    if (!value) {
      this.setDnsPrimaryProviderId(null)
    } else if (!state.dnsPrimaryProviderId) {
      const id = dnsDefaultPrimaryProviderId.value
      if (id) {
        this.setDnsPrimaryProviderId(id)
      }
    }
  }

  function addDnsProvider () {
    const type = head(dnsProviderTypes.value)
    const secret = head(getDnsProviderSecrets(type))
    const secretName = get(secret, 'metadata.name')
    const id = uuidv4()
    state.dnsProviderIds.push(id)
    state.dnsProviders[id] = {
      id,
      type,
      secretName,
      excludeDomains: [],
      includeDomains: [],
      excludeZones: [],
      includeZones: [],
      readonly: false,
    }
  }

  function patchDnsProvider (value) {
    const id = getId(value)
    const index = state.dnsProviderIds.indexOf(id)
    if (index !== -1 && has(state.dnsProviders, id)) {
      const object = omit(value, ['id'])
      for (const [key, value] of Object.entries(object)) {
        state.dnsProviders[id][key] = value
      }
    }
  }

  function deleteDnsProvider (id) {
    const index = state.dnsProviderIds.indexOf(id)
    if (index !== -1) {
      state.dnsProviderIds.splice(index, 1)
    }
    delete state.dnsProviders[id]
    if (isEmpty(state.dnsProviderIds)) {
      state.dnsDomain = null
      state.dnsPrimaryProviderId = null
    } else if (state.dnsPrimaryProviderId === id) {
      state.dnsPrimaryProviderId = null
    }
  }

  function setCloudProfileName (value) {
    state.cloudProfileName = value
  }

  function setSeedName (value) {
    state.seedName = value
  }

  function setWorkerless (value) {
    state.workerless = value
  }

  function setClusterConfiguration (value) {
    const {
      metadata = {},
      spec: {
        dns = {},
        cloudProfileName,
        controlPlane = {},
        seedName,
      },
    } = value
    // metadata
    setMetadata(metadata)
    // dns configuration
    let primaryProviderId = null
    const domain = dns.domain
    const providers = map(dns.providers, provider => {
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
        primaryProviderId = id
      }
      let readonly = false
      if (!clusterIsNew.value) {
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
    setDns({
      domain,
      providers,
      primaryProviderId,
    })
    setCloudProfileName(cloudProfileName)
    const failureToleranceType = controlPlane.highAvailability?.failureTolerance?.type
    state.controlPlaneFailureToleranceType = failureToleranceType
    state.initialControlPlaneFailureToleranceType = failureToleranceType
    setSeedName(seedName)
  }

  function setMetadata (metadata) {
    state.metadata = metadata
  }

  function setDns ({ domain, providers = [], primaryProviderId = null }) {
    state.dnsDomain = domain
    state.dnsProviders = keyBy(providers, 'id')
    state.dnsProviderIds = map(providers, 'id')
    state.dnsPrimaryProviderId = primaryProviderId
  }

  function setDnsPrimaryProvider (value) {
    state.dnsPrimaryProviderId = getId(value)
  }

  function setDnsPrimaryProviderId (value) {
    state.dnsPrimaryProviderId = value
  }

  function setControlPlaneFailureToleranceType (value) {
    state.controlPlaneFailureToleranceType = value
  }

  return {
    // state
    dnsDomain,
    dnsProviderIds,
    cloudProfileName,
    seedName,
    controlPlaneFailureToleranceType,
    workerless,
    // getters
    clusterIsNew,
    dnsProviderTypes,
    dnsProviderTypesWithPrimarySupport,
    dnsProviders,
    dnsProvidersWithPrimarySupport,
    dnsPrimaryProvider,
    dnsDefaultPrimaryProviderId,
    controlPlaneFailureToleranceTypeChangeAllowed,
    // actions
    getDnsProviderSecrets,
    findDnsProviderSecret,
    getDnsConfiguration,
    setDnsDomain,
    addDnsProvider,
    patchDnsProvider,
    deleteDnsProvider,
    setCloudProfileName,
    setSeedName,
    setClusterConfiguration,
    setDns,
    setDnsPrimaryProvider,
    setDnsPrimaryProviderId,
    setControlPlaneFailureToleranceType,
    setWorkerless,
  }
})
