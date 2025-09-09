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
import { credentialName } from '@/composables/credential/helper'

import get from 'lodash/get'
import set from 'lodash/set'
import unset from 'lodash/unset'
import find from 'lodash/find'
import map from 'lodash/map'
import head from 'lodash/head'
import includes from 'lodash/includes'
import filter from 'lodash/filter'
import isEmpty from 'lodash/isEmpty'

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
    getResourceRefName,
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

  /* dns */
  const dnsDomain = computed({
    get () {
      return get(manifest.value, ['spec', 'dns', 'domain'])
    },
    set (value) {
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

  function patchDnsPrimaryProvider (data) {
    // 'spec.dns.providers' may only contain a single primary provider. For historical reasons it is still an array
    dnsProviders.value = [{
      primary: true,
      ...dnsPrimaryProvider.value,
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

  const dnsPrimaryProviderSecretName = computed({
    get () {
      return dnsPrimaryProvider.value?.secretName
    },
    set (secretName) {
      patchDnsPrimaryProvider({ secretName })
    },
  })

  const primaryDnsServiceExtensionProvider = computed(() => {
    if (!dnsPrimaryProvider.value) {
      return undefined
    }
    return find(dnsServiceExtensionProviders.value, provider => {
      const providerSecretName = getResourceRefName(provider.secretName)
      return provider.type === dnsPrimaryProvider.value.type &&
        providerSecretName === dnsPrimaryProvider.value.secretName
    })
  })

  const hasDnsServiceExtensionProviderForCustomDomain = computed(() => {
    const provider = primaryDnsServiceExtensionProvider.value
    return provider
      ? includes(provider.domains?.include, dnsDomain.value)
      : false
  })

  function getDnsServiceExtensionResourceName (secretName) {
    return secretName
      ? `shoot-dns-service-${secretName}`
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

  function getDefaultSecretName (type) {
    const bindings = useCloudProviderEntityList(toRef(type), { credentialStore, gardenerExtensionStore, cloudProfileStore })
    // find unused secret
    const usedResourceNames = map(resources.value, 'name')
    const binding = find(bindings.value, binding => {
      const resourceName = getDnsServiceExtensionResourceName(credentialName(binding))
      return !includes(usedResourceNames, resourceName)
    })

    return credentialName(binding)
  }

  function addDnsServiceExtensionProvider (options = {}) {
    const {
      type = head(gardenerExtensionStore.dnsProviderTypes),
      secretName = getDefaultSecretName(type),
    } = options

    const resourceName = getDnsServiceExtensionResourceName(secretName)
    const provider = {
      type,
      secretName: resourceName, // resourceName is the secret name
    }
    if (isEmpty(dnsServiceExtensionProviders.value)) {
      setDnsServiceExtension({ providers: [provider] })
    } else {
      dnsServiceExtensionProviders.value.push(provider)
    }

    setResource({
      name: resourceName,
      resourceRef: {
        apiVersion: 'v1',
        kind: 'Secret',
        name: secretName,
      },
    })

    return provider
  }

  function deleteDnsServiceExtensionProvider (index) {
    const provider = get(dnsServiceExtensionProviders.value, [index])
    if (!provider) {
      return
    }

    const resourceName = provider.secretName
    deleteResource(resourceName)

    dnsServiceExtensionProviders.value.splice(index, 1)
    if (isEmpty(dnsServiceExtensionProviders.value)) {
      deleteExtension('shoot-dns-service')
    }
  }

  function forceMigrateSyncDnsProvidersToFalse () {
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
    dnsPrimaryProviderSecretName,
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
    getResourceRefName,
  }
}
