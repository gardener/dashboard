//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { decodeBase64 } from '@/utils'
import infraProviders from '@/data/vendors/infra'
import dnsProviders from '@/data/vendors/dns'

import get from 'lodash/get'

const cloudProviderConfigs = [...infraProviders, ...dnsProviders]
const cloudProviderConfigByName = new Map(cloudProviderConfigs.map(provider => [provider.name, provider]))

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

function getGCPProjectId (secretData) {
  const serviceAccount = get(secretData, ['serviceaccount.json'])
  if (!serviceAccount) {
    return undefined
  }
  return get(JSON.parse(decodeBase64(serviceAccount)), ['project_id'])
}

function getGCPDNSProject (secretData) {
  return decodeSecretValue(secretData, 'project') || getGCPProjectId(secretData)
}

const detailValueResolver = new Map([
  ['gcpProjectId', getGCPProjectId],
  ['gcpDnsProject', getGCPDNSProject],
])

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
      const resolver = detailValueResolver.get(valueFrom)
      return {
        label,
        value: resolver?.(secretData),
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
  // TODO check for provider.extensions.gardener.cloud once wlids are supported
  const labels = credential?.metadata?.labels
  if (!labels) {
    return undefined
  }

  const DASHBOARD = 'dashboard.gardener.cloud/dnsProviderType'
  const PREFIX = 'provider.shoot.gardener.cloud/'

  // for DNS credentials: prefer the dashboard-specific label
  if (DASHBOARD in labels) {
    return get(labels, [DASHBOARD])
  }
  // Or find the first shoot provider label set to "true"
  const key = Object.keys(labels).find(k => {
    return k.startsWith(PREFIX) && get(labels, [k]) === 'true'
  })

  return key ? key.slice(PREFIX.length) : undefined
}

export function isDNSCredential ({ credential, dnsProviderTypes }) {
  return dnsProviderTypes.includes(credentialProviderType(credential))
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
export function secretDetails ({ secret, providerType }) {
  const secretData = secret.data || {}
  try {
    const providerConfig = cloudProviderConfigByName.get(providerType)
    if (!providerConfig) {
      return undefined
    }

    return resolveSecretDetailsFromVendorConfig({
      secretData,
      providerConfig,
    })
  } catch (err) {
    return undefined
  }
}
