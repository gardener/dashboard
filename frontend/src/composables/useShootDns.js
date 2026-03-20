//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  toRef,
} from 'vue'

import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useCredentialStore } from '@/store/credential'
import { useCloudProfileStore } from '@/store/cloudProfile'

import { useShootResources } from '@/composables/useShootResources'
import { useShootExtensions } from '@/composables/useShootExtensions'
import { useCloudProviderEntityList } from '@/composables/credential/useCloudProviderEntityList'
import {
  dnsProviderCredentialsRef,
  dnsExtensionProviderResourceName,
  dnsCredentialResourceNamePart,
} from '@/composables/credential/helper'

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
      normalizeDnsProviderCredentialsRefs()
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

  function normalizeDnsProviderCredentialsRef (provider) {
    const credentialsRef = dnsProviderCredentialsRef(provider)
    if (!credentialsRef) {
      return provider
    }

    return {
      ...omit(provider, ['secretName']),
      credentialsRef,
    }
  }

  function normalizeDnsProviderCredentialsRefs () {
    if (!dnsProviders.value) {
      return
    }

    dnsProviders.value = map(dnsProviders.value, normalizeDnsProviderCredentialsRef)
  }

  function patchDnsPrimaryProvider (data) {
    // 'spec.dns.providers' may only contain a single primary provider. For historical reasons it is still an array
    dnsProviders.value = [{
      primary: true,
      ...normalizeDnsProviderCredentialsRef(dnsPrimaryProvider.value),
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
      return dnsProviderCredentialsRef(dnsPrimaryProvider.value)
    },
    set (credentialsRef) {
      const provider = omit(dnsPrimaryProvider.value, ['secretName'])
      patchDnsPrimaryProvider({
        ...provider,
        credentialsRef,
      })
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

  const primaryDnsServiceExtensionProviderResourceRef = computed(() => {
    const resourceName = dnsExtensionProviderResourceName(primaryDnsServiceExtensionProvider.value)
    return resourceName
      ? getResourceRef(resourceName)
      : undefined
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

  function getDefaultCredentialName (type) {
    const credentials = useCloudProviderEntityList(toRef(type), { credentialStore, gardenerExtensionStore, cloudProfileStore })
    // find unused credential
    const usedResourceNames = map(resources.value, 'name')
    const credential = find(credentials.value, credential => {
      const resourceName = getDnsServiceExtensionResourceName({
        kind: credential?.kind,
        name: credential?.metadata?.name,
      })
      return !includes(usedResourceNames, resourceName)
    })

    return credential
  }

  function addDnsServiceExtensionProvider (options = {}) {
    normalizeDnsServiceExtensionProviders()
    normalizeDnsProviderCredentialsRefs()

    const type = options.type ?? head(gardenerExtensionStore.dnsProviderTypes)
    const defaultCredential = getDefaultCredentialName(type)
    const credentialsRef = options.credentialsRef ?? (options.secretName
      ? {
          apiVersion: 'v1',
          kind: 'Secret',
          name: options.secretName,
        }
      : defaultCredential
        ? {
            apiVersion: defaultCredential.apiVersion,
            kind: defaultCredential.kind,
            name: defaultCredential.metadata?.name,
          }
        : undefined)

    const credentials = useCloudProviderEntityList(toRef(type), { credentialStore, gardenerExtensionStore, cloudProfileStore })
    const credential = find(credentials.value, credential => {
      return dnsCredentialResourceNamePart({
        kind: credential?.kind,
        name: credential?.metadata?.name,
      }) === dnsCredentialResourceNamePart(credentialsRef)
    })

    const resourceName = getDnsServiceExtensionResourceName(credentialsRef)
    const provider = {
      type,
      credentials: resourceName,
    }
    if (isEmpty(dnsServiceExtensionProviders.value)) {
      setDnsServiceExtension({ providers: [provider] })
    } else {
      dnsServiceExtensionProviders.value.push(provider)
    }

    const resourceRef = credential
      ? {
          apiVersion: credential.apiVersion,
          kind: credential.kind,
          name: credential.metadata?.name,
        }
      : credentialsRef

    if (resourceName && resourceRef) {
      setResource({
        name: resourceName,
        resourceRef,
      })
    }

    return provider
  }

  function deleteDnsServiceExtensionProvider (index) {
    normalizeDnsServiceExtensionProviders()
    normalizeDnsProviderCredentialsRefs()

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
    normalizeDnsProviderCredentialsRefs()

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
    deleteResource,
    setResource,
    getResourceRef,
    primaryDnsServiceExtensionProviderResourceRef,
  }
}
