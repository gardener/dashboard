//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useCredentialStore } from '@/store/credential'
import { useCloudProfileStore } from '@/store/cloudProfile'

import { useShootResources } from '@/composables/useShootResources'
import { useShootExtensions } from '@/composables/useShootExtensions'
import {
  getCloudProviderEntityList,
  getDnsPrimaryProviderCredentialsRef,
  dnsExtensionProviderResourceName,
  dnsCredentialResourceNamePart,
} from '@/composables/credential/helper'

import { v4 as uuidv4 } from '@/utils/uuid'

import get from 'lodash/get'
import set from 'lodash/set'
import unset from 'lodash/unset'
import find from 'lodash/find'
import map from 'lodash/map'
import head from 'lodash/head'
import includes from 'lodash/includes'
import filter from 'lodash/filter'
import isEmpty from 'lodash/isEmpty'
import omit from 'lodash/omit'

const dnsServiceExtensionProviderUidMap = new WeakMap()

export const useShootDns = (manifest, options) => {
  const {
    gardenerExtensionStore = useGardenerExtensionStore(),
    credentialStore = useCredentialStore(),
    cloudProfileStore = useCloudProfileStore(),
  } = options

  /* resources */
  const {
    resources,
    deleteResource,
    setResource,
    getResourceRef,
  } = useShootResources(manifest)

  /* extensions */
  const {
    extensions,
    setExtension,
    deleteExtension,
  } = useShootExtensions(manifest)

  function setDnsServiceExtension ({ providers } = {}) {
    setExtension({
      type: 'shoot-dns-service',
      providerConfig: {
        apiVersion: 'service.dns.extensions.gardener.cloud/v1alpha1',
        kind: 'DNSConfig',
        syncProvidersFromShootSpecDNS: false,
        providers,
      },
    })
  }

  const dnsServiceExtension = computed(() => {
    return find(extensions.value, ['type', 'shoot-dns-service'])
  })

  const dnsServiceExtensionProviders = computed({
    get () {
      return get(dnsServiceExtension.value, ['providerConfig', 'providers'], [])
    },
    set (value) {
      set(dnsServiceExtension.value, ['providerConfig', 'providers'], value)
    },
  })

  function getDnsServiceExtensionProviderUid (provider) {
    if (!provider || typeof provider !== 'object') {
      return undefined
    }

    let uid = dnsServiceExtensionProviderUidMap.get(provider)
    if (!uid) {
      uid = uuidv4()
      dnsServiceExtensionProviderUidMap.set(provider, uid)
    }

    return uid
  }

  function normalizeDnsServiceExtensionProvider (provider) {
    if (!provider?.secretName) {
      return provider
    }

    return {
      ...omit(provider, ['secretName']),
      credentials: provider.credentials ?? provider.secretName,
    }
  }

  function normalizeDnsServiceExtensionProviders () {
    if (!dnsServiceExtension.value) {
      return
    }

    dnsServiceExtensionProviders.value = map(dnsServiceExtensionProviders.value, normalizeDnsServiceExtensionProvider)
  }

  /* dns */
  const dnsDomain = computed({
    get () {
      return get(manifest.value, ['spec', 'dns', 'domain'])
    },
    set (value) {
      normalizeDnsServiceExtensionProviders()
      normalizeDnsPrimaryProviderCredentialsRefs()
      set(manifest.value, ['spec', 'dns', 'domain'], value)
    },
  })

  const dnsProviders = computed({
    get () {
      return get(manifest.value, ['spec', 'dns', 'providers'])
    },
    set (value) {
      if (value) {
        set(manifest.value, ['spec', 'dns', 'providers'], value)
      } else {
        unset(manifest.value, ['spec', 'dns', 'providers'])
      }
    },
  })

  function resetDnsPrimaryProvider () {
    if (!dnsDomain.value) {
      dnsProviders.value = undefined
    }
  }

  const dnsPrimaryProvider = computed(() => {
    return find(dnsProviders.value, ['primary', true])
  })

  function normalizeDnsPrimaryProviderCredentialsRef (provider) {
    const credentialsRef = getDnsPrimaryProviderCredentialsRef(provider)
    if (!credentialsRef) {
      return provider
    }

    return {
      ...omit(provider, ['secretName']),
      credentialsRef,
    }
  }

  function normalizeDnsPrimaryProviderCredentialsRefs () {
    if (!dnsProviders.value) {
      return
    }

    dnsProviders.value = map(dnsProviders.value, normalizeDnsPrimaryProviderCredentialsRef)
  }

  function patchDnsPrimaryProvider (data) {
    // 'spec.dns.providers' may only contain a single primary provider. For historical reasons it is still an array
    dnsProviders.value = [{
      primary: true,
      ...normalizeDnsPrimaryProviderCredentialsRef(dnsPrimaryProvider.value),
      ...data,
    }]
  }

  const dnsPrimaryProviderType = computed({
    get () {
      return dnsPrimaryProvider.value?.type
    },
    set (type) {
      patchDnsPrimaryProvider({ type })
    },
  })

  const dnsPrimaryProviderCredentialsRef = computed({
    get () {
      return getDnsPrimaryProviderCredentialsRef(dnsPrimaryProvider.value)
    },
    set (credentialsRef) {
      patchDnsPrimaryProvider({ credentialsRef })
    },
  })

  const primaryDnsServiceExtensionProvider = computed(() => {
    if (!dnsPrimaryProvider.value) {
      return undefined
    }
    return find(dnsServiceExtensionProviders.value, provider => {
      const resourceName = dnsExtensionProviderResourceName(provider)
      const providerCredentialRef = getResourceRef(resourceName)
      return provider.type === dnsPrimaryProvider.value.type &&
        providerCredentialRef?.name === dnsPrimaryProviderCredentialsRef.value?.name &&
        providerCredentialRef?.kind === dnsPrimaryProviderCredentialsRef.value?.kind
    })
  })

  const hasDnsServiceExtensionProviderForCustomDomain = computed(() => {
    const provider = primaryDnsServiceExtensionProvider.value
    return provider
      ? includes(provider.domains?.include, dnsDomain.value)
      : false
  })

  function getDnsServiceExtensionResourceName (credentialRef) {
    const key = dnsCredentialResourceNamePart(credentialRef)
    return key
      ? `shoot-dns-service-${key}`
      : undefined
  }

  function addDnsServiceExtensionProviderForCustomDomain () {
    if (hasDnsServiceExtensionProviderForCustomDomain.value) {
      return
    }
    const customDomainProvider = primaryDnsServiceExtensionProvider.value ?? addDnsServiceExtensionProvider(dnsPrimaryProvider.value)
    if (isEmpty(customDomainProvider.domains?.include)) {
      set(customDomainProvider, ['domains', 'include'], [dnsDomain.value])
    } else {
      customDomainProvider.domains.include.push(dnsDomain.value)
    }
  }

  function getDefaultCredential (providerType) {
    const credentials = getCloudProviderEntityList(providerType, {
      credentialStore,
      gardenerExtensionStore,
      cloudProfileStore,
    })

    const usedResourceRefs = map(resources.value, 'resourceRef')

    const isCredentialUsed = credential => {
      const kind = credential?.kind
      const name = credential?.metadata?.name

      return usedResourceRefs.some(resourceRef =>
        resourceRef?.kind === kind &&
      resourceRef?.name === name,
      )
    }

    return credentials.find(credential => !isCredentialUsed(credential))
  }

  function addDnsServiceExtensionProvider (provider = {}) {
    normalizeDnsServiceExtensionProviders()
    normalizeDnsPrimaryProviderCredentialsRefs()

    const type = provider.type ?? head(gardenerExtensionStore.dnsProviderTypes)
    const defaultCredential = getDefaultCredential(type)

    let credentialsRef
    if (provider.credentialsRef) {
      credentialsRef = provider.credentialsRef
    } else if (provider.secretName) {
      credentialsRef = {
        apiVersion: 'v1',
        kind: 'Secret',
        name: provider.secretName,
      }
    } else if (defaultCredential) {
      credentialsRef = {
        apiVersion: defaultCredential.apiVersion,
        kind: defaultCredential.kind,
        name: defaultCredential.metadata?.name,
      }
    }

    const credentialsForProviderType = getCloudProviderEntityList(type, { credentialStore, gardenerExtensionStore, cloudProfileStore })
    const credential = find(credentialsForProviderType, credential => {
      return dnsCredentialResourceNamePart({
        kind: credential?.kind,
        name: credential?.metadata?.name,
      }) === dnsCredentialResourceNamePart(credentialsRef)
    })

    const resourceName = getDnsServiceExtensionResourceName(credentialsRef)
    const extensionProvider = {
      type,
      credentials: resourceName,
    }
    if (isEmpty(dnsServiceExtensionProviders.value)) {
      setDnsServiceExtension({ providers: [extensionProvider] })
    } else {
      dnsServiceExtensionProviders.value.push(extensionProvider)
    }

    let resourceRef
    if (credential) {
      resourceRef = {
        apiVersion: credential.apiVersion,
        kind: credential.kind,
        name: credential.metadata?.name,
      }
    } else {
      resourceRef = credentialsRef
    }

    if (resourceName && resourceRef) {
      setResource({
        name: resourceName,
        resourceRef,
      })
    }

    return extensionProvider
  }

  function deleteDnsServiceExtensionProvider (index) {
    normalizeDnsServiceExtensionProviders()
    normalizeDnsPrimaryProviderCredentialsRefs()

    const provider = get(dnsServiceExtensionProviders.value, [index])
    if (!provider) {
      return
    }

    const resourceName = dnsExtensionProviderResourceName(provider)
    deleteResource(resourceName)

    dnsServiceExtensionProviders.value.splice(index, 1)
    if (isEmpty(dnsServiceExtensionProviders.value)) {
      deleteExtension('shoot-dns-service')
    }
  }

  function forceMigrateSyncDnsProvidersToFalse () {
    normalizeDnsServiceExtensionProviders()
    normalizeDnsPrimaryProviderCredentialsRefs()

    if (get(dnsServiceExtension.value, ['providerConfig', 'syncProvidersFromShootSpecDNS']) === true) {
      // Migrate from old DNS configuration to new DNS configuration
      set(dnsServiceExtension.value, ['providerConfig', 'syncProvidersFromShootSpecDNS'], false)
      dnsProviders.value = filter(dnsProviders.value, ['primary', true])
    } else if (!dnsServiceExtension.value) {
      // set default empty dns service extension where sync is set to off
      setDnsServiceExtension()
    }
  }

  return {
    /* dns */
    dnsDomain,
    dnsPrimaryProviderType,
    dnsPrimaryProviderCredentialsRef,
    resetDnsPrimaryProvider,
    forceMigrateSyncDnsProvidersToFalse,
    dnsServiceExtensionProviders,
    addDnsServiceExtensionProvider,
    deleteDnsServiceExtensionProvider,
    hasDnsServiceExtensionProviderForCustomDomain,
    addDnsServiceExtensionProviderForCustomDomain,
    getDnsServiceExtensionResourceName,
    getDnsServiceExtensionProviderUid,
    deleteResource,
    setResource,
    getResourceRef,
  }
}
