//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  decodeBase64,
  isTruthyValue,
} from '@/utils'

import get from 'lodash/get'
import filter from 'lodash/filter'
import map from 'lodash/map'
import omit from 'lodash/omit'

function isSecretDetailValuePath (path) {
  return Array.isArray(path) &&
    path.length > 0 &&
    path.every(segment => typeof segment === 'string' || typeof segment === 'number')
}

function normalizeSecretDetailValuePaths ({ key, keys }) {
  const hasKey = key !== undefined
  const hasKeys = keys !== undefined

  if (hasKey === hasKeys) {
    return undefined
  }

  const paths = hasKey ? [key] : keys
  if (
    !Array.isArray(paths) ||
    paths.length === 0 ||
    paths.some(path => !isSecretDetailValuePath(path))
  ) {
    return undefined
  }

  return paths
}

function secretDetailValueFromPaths (value, paths) {
  for (const path of paths) {
    const selectedValue = get(value, path)
    if (selectedValue) {
      return selectedValue
    }
  }

  return undefined
}

function parseSecretDetailValue (value, parse) {
  if (parse === undefined) {
    return value
  }

  switch (parse) {
    case 'json':
      try {
        return JSON.parse(value)
      } catch {
        return undefined
      }
    default:
      return undefined
  }
}

function resolveSecretDetailValue (secretData, valueFrom) {
  if (!valueFrom || typeof valueFrom !== 'object' || Array.isArray(valueFrom)) {
    return undefined
  }

  const {
    key,
    keys,
    decode = true,
    parse,
    path,
  } = valueFrom

  const paths = normalizeSecretDetailValuePaths({ key, keys })
  if (!paths) {
    return undefined
  }

  let value = secretDetailValueFromPaths(secretData, paths)

  if (value === undefined) {
    return undefined
  }

  if (decode) {
    value = decodeBase64(value)
  }

  value = parseSecretDetailValue(value, parse)

  if (path !== undefined) {
    if (!isSecretDetailValuePath(path)) {
      return undefined
    }
    return get(value, path)
  }

  return value
}

function resolveSecretDetailsFromVendorConfig ({ secretData, providerConfig }) {
  const detailDefinitions = get(providerConfig, ['secret', 'details'])
  if (!Array.isArray(detailDefinitions) || detailDefinitions.length === 0) {
    return undefined
  }

  return detailDefinitions.map(detail => {
    const {
      label,
      hidden,
      valueFrom,
    } = detail

    if (hidden) {
      return { label, hidden: true }
    }

    if (!valueFrom) {
      return { label }
    }

    return {
      label,
      value: resolveSecretDetailValue(secretData, valueFrom),
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
  vendorType,
}) {
  if (vendorType === 'infra') {
    return filter(credentialStore.infrastructureBindingList, binding => {
      return bindingProviderType(binding) === providerType
    })
  }
  if (vendorType === 'dns') {
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
