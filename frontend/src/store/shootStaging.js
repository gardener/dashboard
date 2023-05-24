//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
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
import assign from 'lodash/assign'

import { v4 as uuidv4 } from '@/utils/uuid'

import { useGardenerExtensionStore } from './gardenerExtension'
import { useSecretStore } from './secret'

export const useShootStagingStore = defineStore('shootStaging', () => {
  const gardenerExtensionStore = useGardenerExtensionStore()
  const secretStore = useSecretStore()

  // helper
  function getId (object) {
    return get(object, 'id', null)
  }

  function isDnsProviderValid ({ type, secretName }) {
    return !!type && !!secretName
  }

  function notYetCreated () {
    return !get(metadata.value, 'creationTimestamp')
  }

  // state
  const metadata = ref({})
  const dnsDomain = ref(null)
  const dnsProviders = ref({})
  const dnsProviderIds = ref([])
  const dnsPrimaryProviderId = ref(null)
  const dnsPrimaryProviderValid = ref(null)
  const cloudProfileName = ref(null)
  const controlPlaneFailureToleranceType = ref(null)
  const initialControlPlaneFailureToleranceType = ref(null)
  const seedName = ref(null)

  const clusterIsNew = computed(() => {
    return notYetCreated()
  })

  const dnsProviderTypes = computed(() => {
    return map(gardenerExtensionStore.sortedDnsProviderList, 'type')
  })

  const dnsProviderTypesWithPrimarySupport = computed(() => {
    return map(filter(gardenerExtensionStore.sortedDnsProviderList, 'primary'), 'type')
  })

  function findDnsProviderSecret (type, secretName) {
    const secrets = secretStore.dnsSecretsByProviderKind(type)
    return find(secrets, ['metadata.secretRef.name', secretName])
  }

  const dnsProvidersWithPrimarySupport = computed(() => {
    const types = dnsProviderTypesWithPrimarySupport
    return filter(dnsProviders.value, ({ type }) => includes(types, type))
  })

  const dnsProvidersValid = computed(() => {
    return every(dnsProviders.value, 'valid')
  })

  const dnsPrimaryProvider = computed(() => {
    return dnsProviders.value[dnsPrimaryProviderId.value]
  })

  const dnsDefaultPrimaryProviderId = computed(() => {
    const defaultPrimaryProvider = head(dnsProvidersWithPrimarySupport.value)
    return getId(defaultPrimaryProvider)
  })

  const getDnsConfiguration = computed(() => {
    const providerById = id => {
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
    }

    const dns = {
      providers: map(dnsProviderIds.value, providerById),
    }
    const domain = dnsDomain.value
    if (domain && domain.length) {
      dns.domain = domain
    }
    return dns
  })

  const dnsConfigurationValid = computed(() => {
    return dnsPrimaryProviderValid.value && dnsProvidersValid.value
  })

  const controlPlaneFailureToleranceTypeChangeAllowed = computed(() => {
    return clusterIsNew.value || !initialControlPlaneFailureToleranceType.value
  })

  function setDnsDomain (value) {
    dnsDomain.value = value
    if (!value) {
      dnsPrimaryProviderId.value = null
    } else if (!dnsPrimaryProviderId.value) {
      const id = dnsDefaultPrimaryProviderId.value
      if (id) {
        dnsPrimaryProviderId.value = id
      }
    }
  }

  function addDnsProvider () {
    const type = head(dnsProviderTypes.value)
    const secret = head(secretStore.dnsSecretsByProviderKind(type))
    const secretName = get(secret, 'metadata.name')
    const id = uuidv4()
    const dnsProvider = {
      id,
      type,
      secretName,
      excludeDomains: [],
      includeDomains: [],
      excludeZones: [],
      includeZones: [],
      valid: isDnsProviderValid({ type, secretName }),
      readonly: false,
    }
    const index = dnsProviderIds.value.indexOf(id)
    if (index === -1) {
      dnsProviderIds.value.push(id)
      dnsProviders.value[id] = dnsProvider
    }
  }

  function patchDnsProvider (value) {
    const id = getId(value)
    const index = dnsProviderIds.value.indexOf(id)
    if (index !== -1 && has(dnsProviders.value, id)) {
      const object = omit(value, ['id'])
      assign(dnsProviders.value[id], object)
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
      dnsPrimaryProviderValid.value = true
    } else if (dnsPrimaryProviderId.value === id) {
      dnsPrimaryProviderId.value = null
      dnsPrimaryProviderValid.value = !dnsDomain.value
    }
  }

  function setClusterConfiguration (value) {
    const {
      metadata: _metadata = {},
      spec: {
        dns: _dns = {},
        cloudProfileName: _cloudProfileName,
        controlPlane: _controlPlane = {},
        seedName: _seedName,
      },
    } = value
    // metadata
    metadata.value = _metadata

    // dns configuration
    let primaryProviderId = null
    const domain = _dns.domain
    const providers = map(_dns.providers, provider => {
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
    dnsDomain.value = domain
    dnsProviders.value = keyBy(providers, 'id')
    dnsProviderIds.value = map(providers, 'id')
    dnsPrimaryProviderId.value = primaryProviderId
    dnsPrimaryProviderValid.value = true

    cloudProfileName.value = _cloudProfileName
    controlPlaneFailureToleranceType.value = _controlPlane.highAvailability?.failureTolerance?.type
    initialControlPlaneFailureToleranceType.value = _controlPlane.highAvailability?.failureTolerance?.type
    seedName.value = _seedName
  }

  return {
    cloudProfileName,
    dnsDomain,
    dnsProviderIds,
    clusterIsNew,
    dnsProvidersWithPrimarySupport,
    dnsPrimaryProvider,
    addDnsProvider,
    controlPlaneFailureToleranceType,
    controlPlaneFailureToleranceTypeChangeAllowed,
    getDnsConfiguration,
    dnsConfigurationValid,
  }
})
