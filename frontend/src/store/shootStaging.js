//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'

import { useGardenerExtensionStore } from './gardenerExtension'

import { v4 as uuidv4 } from '@/utils/uuid'

import has from 'lodash/has'
import get from 'lodash/get'
import set from 'lodash/set'
import head from 'lodash/head'
import map from 'lodash/map'
import keyBy from 'lodash/keyBy'
import omit from 'lodash/omit'
import filter from 'lodash/filter'
import includes from 'lodash/includes'
import isEmpty from 'lodash/isEmpty'
import every from 'lodash/every'
import find from 'lodash/find'
import { useSecretStore } from './secret'

// helper
function getId (object) {
  return get(object, 'id', null)
}

function isDnsProviderValid ({ type, secretName }) {
  return !!type && !!secretName
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
    dnsPrimaryProviderValid: null,
    cloudProfileName: null,
    controlPlaneFailureToleranceType: null,
    initialControlPlaneFailureToleranceType: null,
    seedName: null,
  })

  const dnsDomain = computed(() => {
    return state.dnsDomain
  })

  const cloudProfileName = computed(() => {
    return state.cloudProfileName
  })

  const seedName = computed(() => {
    return state.seedName
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
    return map(state.dnsProviderIds, id => state.dnsProviders[id])
  })

  const dnsProvidersWithPrimarySupport = computed(() => {
    const types = dnsProviderTypesWithPrimarySupport.value
    return filter(dnsProviders.value, ({ type }) => includes(types, type))
  })

  const dnsProvidersValid = computed(() => {
    return every(state.dnsProviders, 'valid')
  })

  const dnsPrimaryProvider = computed(() => {
    return state.dnsProviders[state.dnsPrimaryProviderId]
  })

  const dnsDefaultPrimaryProviderId = computed(() => {
    const defaultPrimaryProvider = head(dnsProvidersWithPrimarySupport.value)
    return getId(defaultPrimaryProvider)
  })

  const dnsConfigurationValid = computed(() => {
    return state.dnsPrimaryProviderValid && dnsProvidersValid.value
  })

  const controlPlaneFailureToleranceTypeChangeAllowed = computed(() => {
    return clusterIsNew.value || !state.initialControlPlaneFailureToleranceType
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
    this.SET_DNS_DOMAIN(value)
    if (!value) {
      this.SET_DNS_PRIMARY_PROVIDER_ID(null)
    } else if (!state.dnsPrimaryProviderId) {
      const id = dnsDefaultPrimaryProviderId.value
      if (id) {
        this.SET_DNS_PRIMARY_PROVIDER_ID(id)
      }
    }
  }

  function addDnsProvider () {
    const type = head(dnsProviderTypes.value)
    const secret = head(getDnsProviderSecrets(type))
    const secretName = get(secret, 'metadata.name')
    const id = uuidv4()
    this.ADD_DNS_PROVIDER({
      id,
      type,
      secretName,
      excludeDomains: [],
      includeDomains: [],
      excludeZones: [],
      includeZones: [],
      valid: isDnsProviderValid({ type, secretName }),
      readonly: false,
    })
  }

  function setCloudProfileName (value) {
    this.SET_CLOUD_PROFILE_NAME(value)
  }

  function setControlPlaneFailureToleranceType (value) {
    this.SET_CONTROL_PLANE_FAILURE_TOLERANCE_TYPE(value)
  }

  function setSeedName (value) {
    this.SET_SEED_NAME(value)
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
    this.SET_METADATA(metadata)
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
        valid: isDnsProviderValid({ type, secretName }),
        readonly,
      }
    })
    this.SET_DNS({
      domain,
      providers,
      primaryProviderId,
    })
    this.SET_CLOUD_PROFILE_NAME(cloudProfileName)
    const failureToleranceType = controlPlane.highAvailability?.failureTolerance?.type
    this.SET_CONTROL_PLANE_FAILURE_TOLERANCE_TYPE(failureToleranceType)
    this.SET_INITIAL_CONTROL_PLANE_FAILURE_TOLERANCE_TYPE(failureToleranceType)
    this.SET_SEED_NAME(seedName)
  }

  // mutations
  function SET_METADATA (metadata) {
    state.metadata = metadata
  }

  function SET_DNS ({ domain, providers = [], primaryProviderId = null }) {
    state.dnsDomain = domain
    state.dnsProviders = keyBy(providers, 'id')
    state.dnsProviderIds = map(providers, 'id')
    state.dnsPrimaryProviderId = primaryProviderId
    state.dnsPrimaryProviderValid = true
  }

  function SET_DNS_DOMAIN (value) {
    state.dnsDomain = value
  }

  function SET_DNS_PRIMARY_PROVIDER (value) {
    state.dnsPrimaryProviderId = getId(value)
  }

  function SET_DNS_PRIMARY_PROVIDER_ID (value) {
    state.dnsPrimaryProviderId = value
  }

  function SET_DNS_PRIMARY_PROVIDER_VALID (value) {
    state.dnsPrimaryProviderValid = value
  }

  function ADD_DNS_PROVIDER (value) {
    const id = getId(value)
    const index = state.dnsProviderIds.indexOf(id)
    if (index === -1) {
      state.dnsProviderIds.push(id)
      state.dnsProviders[id] = value
    }
  }

  function PATCH_DNS_PROVIDER (value) {
    const id = getId(value)
    const index = state.dnsProviderIds.indexOf(id)
    if (index !== -1 && has(state.dnsProviders, id)) {
      const object = omit(value, ['id'])
      for (const [key, value] of Object.entries(object)) {
        state.dnsProviders[id][key] = value
      }
    }
  }

  function DELETE_DNS_PROVIDER (id) {
    const index = state.dnsProviderIds.indexOf(id)
    if (index !== -1) {
      state.dnsProviderIds.splice(index, 1)
    }
    delete state.dnsProviders[id]
    if (isEmpty(state.dnsProviderIds)) {
      state.dnsDomain = null
      state.dnsPrimaryProviderId = null
      state.dnsPrimaryProviderValid = true
    } else if (state.dnsPrimaryProviderId === id) {
      state.dnsPrimaryProviderId = null
      state.dnsPrimaryProviderValid = !state.dnsDomain
    }
  }

  function SET_CLOUD_PROFILE_NAME (value) {
    state.cloudProfileName = value
  }

  function SET_CONTROL_PLANE_FAILURE_TOLERANCE_TYPE (value) {
    state.controlPlaneFailureToleranceType = value
  }

  function SET_INITIAL_CONTROL_PLANE_FAILURE_TOLERANCE_TYPE (value) {
    state.initialControlPlaneFailureToleranceType = value
  }

  function SET_SEED_NAME (value) {
    state.seedName = value
  }

  return {
    // state
    dnsDomain,
    cloudProfileName,
    seedName,
    // getters
    clusterIsNew,
    dnsProviderTypes,
    dnsProviderTypesWithPrimarySupport,
    dnsProviders,
    dnsProvidersWithPrimarySupport,
    dnsProvidersValid,
    dnsPrimaryProvider,
    dnsDefaultPrimaryProviderId,
    dnsConfigurationValid,
    controlPlaneFailureToleranceTypeChangeAllowed,
    // actions
    getDnsProviderSecrets,
    findDnsProviderSecret,
    getDnsConfiguration,
    setDnsDomain,
    addDnsProvider,
    setCloudProfileName,
    setControlPlaneFailureToleranceType,
    setSeedName,
    setClusterConfiguration,
    // mutations
    SET_METADATA,
    SET_DNS,
    SET_DNS_DOMAIN,
    SET_DNS_PRIMARY_PROVIDER,
    SET_DNS_PRIMARY_PROVIDER_ID,
    SET_DNS_PRIMARY_PROVIDER_VALID,
    ADD_DNS_PROVIDER,
    PATCH_DNS_PROVIDER,
    DELETE_DNS_PROVIDER,
    SET_CLOUD_PROFILE_NAME,
    SET_CONTROL_PLANE_FAILURE_TOLERANCE_TYPE,
    SET_INITIAL_CONTROL_PLANE_FAILURE_TOLERANCE_TYPE,
    SET_SEED_NAME,
  }
})
