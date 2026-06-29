//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { storeToRefs } from 'pinia'

import {
  decodeBase64,
  isTruthyValue,
} from '@/utils'

import get from 'lodash/get'
import filter from 'lodash/filter'
import map from 'lodash/map'
import omit from 'lodash/omit'

function decodeSecretValue (secretData, key) {
  const keys = Array.isArray(key) ? key : [key]
  const selectedKey = keys.find(currentKey => get(secretData, [currentKey]))
  if (!selectedKey) {
    return undefined
  }
  const value = get(secretData, [selectedKey])
  if (!value) {
    return undefined
  }
  return decodeBase64(value)
}

function parseSecretDetailValue (value, parse) {
  switch (parse) {
    case 'json':
      try {
        return JSON.parse(value)
      } catch {
        return undefined
      }
    default:
      return value
  }
}

function resolveSecretDetailValueFromSource (secretData, source) {
  if (!source) {
    return undefined
  }

  if (typeof source === 'string') {
    return decodeSecretValue(secretData, source)
  }

  const {
    key,
    decode = true,
    parse,
    path,
  } = source

  if (!key) {
    return undefined
  }

  let value = decode
    ? decodeSecretValue(secretData, key)
    : get(secretData, [key])

  if (value === undefined) {
    return undefined
  }

  value = parseSecretDetailValue(value, parse)

  if (path) {
    return get(value, path)
  }

  return value
}

function resolveSecretDetailValue (secretData, valueFrom) {
  const sources = Array.isArray(valueFrom)
    ? valueFrom
    : [valueFrom]

  for (const source of sources) {
    const value = resolveSecretDetailValueFromSource(secretData, source)
    if (value !== undefined) {
      return value
    }
  }

  return undefined
}

function resolveSecretDetailsFromVendorConfig ({ secretData, providerConfig }) {
  const detailDefinitions = get(providerConfig, ['secret', 'details'])
  if (!Array.isArray(detailDefinitions) || detailDefinitions.length === 0) {
    return undefined
  }

  return detailDefinitions.map(detail => {
    const {
      label,
      key,
      hidden,
      valueFrom,
      decode = true,
    } = detail

    if (hidden) {
      return { label, hidden: true }
    }

    if (valueFrom) {
      return {
        label,
        value: resolveSecretDetailValue(secretData, valueFrom),
      }
    }

    if (!key) {
      return { label }
    }

    return {
      label,
      value: decode ? decodeSecretValue(secretData, key) : get(secretData, [key]),
    }
  })
}

// Credentials
export function isSecret (credential) {
  return credential?.kind === 'Secret'
}

export function isWorkloadIdentity (credential) {
  return credential?.kind === 'WorkloadIdentity'
}

export function credentialProviderType (credential) {
  const labels = credential?.metadata?.labels
  if (!labels) {
    return undefined
  }

  // For DNS credentials: prefer the dashboard-specific label
  const dnsProviderType = labels['dashboard.gardener.cloud/dnsProviderType']
  if (dnsProviderType) {
    return dnsProviderType
  }

  const providerPrefixes = [
    'provider.shoot.gardener.cloud/',     // Infrastructure credentials referenced on the shoot (e.g. Shoot.spec.credentialsBindingName)
    'provider.extensions.gardener.cloud/', // WorkloadIdentities referenced via resource ref in extensions
  ]

  for (const prefix of providerPrefixes) {
    const key = Object.keys(labels).find(k => k.startsWith(prefix) && isTruthyValue(get(labels, k)))
    if (key) {
      return key.slice(prefix.length)
    }
  }

  return undefined
}

export function isDNSCredential ({ credential, dnsProviderTypes }) {
  return dnsProviderTypes.includes(credentialProviderType(credential))
}

export function getCloudProviderEntityList (providerType, {
  credentialStore,
  gardenerExtensionStore,
  cloudProfileStore,
}) {
  const { dnsProviderTypes } = storeToRefs(gardenerExtensionStore)
  const { sortedInfraProviderTypeList } = storeToRefs(cloudProfileStore)

  if (sortedInfraProviderTypeList.value.includes(providerType)) {
    return filter(credentialStore.infrastructureBindingList, binding => {
      return bindingProviderType(binding) === providerType
    })
  }
  if (dnsProviderTypes.value.includes(providerType)) {
    return filter(credentialStore.dnsCredentialList, credential => {
      return credentialProviderType(credential) === providerType
    })
  }
  return []
}

// DNS Provider references
export function getDnsPrimaryProviderCredentialsRef (provider) {
  if (!provider) {
    return undefined
  }
  if (provider.credentialsRef) {
    return provider.credentialsRef
  }
  // Support legacy field secretName for backward compatibility, but prefer credentialsRef if both are set
  // TODO(grolu): drop support for legacy field secretName
  if (provider.secretName) {
    return {
      apiVersion: 'v1',
      kind: 'Secret',
      name: provider.secretName,
    }
  }
  return undefined
}

export function dnsExtensionProviderResourceName (provider) {
  // secretName is supported for backward compatibility, but credentialsRef is preferred if both are set
  return provider?.credentials ?? provider?.secretName
}

export function dnsCredentialResourceNamePart (credentialRef) {
  const kind = credentialRef?.kind
  const name = credentialRef?.name
  if (!kind || !name) {
    return undefined
  }

  let kindPrefix
  switch (kind) {
    case 'Secret':
      kindPrefix = 's'
      break
    case 'WorkloadIdentity':
      kindPrefix = 'wlid'
      break
    default:
      kindPrefix = kind.toLowerCase()
      break
  }

  return `${kindPrefix}-${name}`
}

// legacy field normalization
// TODO(grolu): drop normalization functions for DNS service extension providers, after legacy fields have been removed from spec
export function normalizeDnsServiceExtensionProvider (provider) {
  if (!provider?.secretName) {
    return provider
  }

  return {
    ...omit(provider, ['secretName']),
    credentials: provider.credentials ?? provider.secretName,
  }
}

export function normalizeDnsServiceExtensionProviders (providers) {
  return map(providers, normalizeDnsServiceExtensionProvider)
}

export function normalizeDnsPrimaryProviderCredentialsRef (provider) {
  const credentialsRef = getDnsPrimaryProviderCredentialsRef(provider)
  if (!credentialsRef) {
    return provider
  }

  return {
    ...omit(provider, ['secretName']),
    credentialsRef,
  }
}

export function normalizeDnsPrimaryProviderCredentialsRefs (providers) {
  return map(providers, normalizeDnsPrimaryProviderCredentialsRef)
}

// Bindings
export function isSecretBinding (binding) {
  return binding?.kind === 'SecretBinding'
}

export function isCredentialsBinding (binding) {
  return binding?.kind === 'CredentialsBinding'
}

export function bindingProviderType (binding) {
  return binding?.provider?.type
}

export function bindingCredentialRef (binding) {
  if (isSecretBinding(binding)) {
    return binding?.secretRef
  }
  if (isCredentialsBinding(binding)) {
    return binding?.credentialsRef
  }
  return undefined
}

export function bindingCredentialName (binding) {
  return bindingCredentialRef(binding)?.name
}

export function bindingCredentialNamespace (binding) {
  return bindingCredentialRef(binding)?.namespace
}

export function bindingCredentialKind (binding) {
  if (isSecretBinding(binding)) {
    return 'Secret'
  }
  if (isCredentialsBinding(binding)) {
    return binding?.credentialsRef?.kind
  }
  return undefined
}

export function isSharedBinding (binding) {
  const bindingNamespace = binding?.metadata?.namespace
  const namespace = bindingCredentialNamespace(binding)
  if (!bindingNamespace || !namespace) {
    return false
  }
  return namespace !== bindingNamespace
}

export function isInfrastructureBinding ({ binding, infraProviderTypes }) {
  return infraProviderTypes.includes(bindingProviderType(binding))
}

// Secret Details
export function secretDetails ({ secret, providerConfig }) {
  const secretData = secret?.data || {}
  if (!providerConfig) {
    return undefined
  }

  return resolveSecretDetailsFromVendorConfig({
    secretData,
    providerConfig,
  })
}
