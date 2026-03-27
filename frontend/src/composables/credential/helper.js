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
  const getGCPProjectId = () => {
    const serviceAccount = get(secretData, ['serviceaccount.json'])
    return get(JSON.parse(decodeBase64(serviceAccount)), ['project_id'])
  }
  try {
    switch (providerType) {
      // infra
      case 'openstack':
        return [
          {
            label: 'Domain Name',
            value: decodeBase64(secretData.domainName),
          },
          {
            label: 'Tenant Name',
            value: decodeBase64(secretData.tenantName),
          },
        ]
      case 'vsphere':
        return [
          {
            label: 'vSphere Username',
            value: decodeBase64(secretData.vsphereUsername),
          },
          {
            label: 'NSX-T Username',
            value: decodeBase64(secretData.nsxtUsername),
          },
        ]
      case 'aws':
        return [
          {
            label: 'Access Key ID',
            value: decodeBase64(secretData.accessKeyID),
          },
        ]
      case 'azure':
        return [
          {
            label: 'Subscription ID',
            value: decodeBase64(secretData.subscriptionID),
          },
        ]
      case 'gcp':
        return [
          {
            label: 'Project',
            value: getGCPProjectId(),
          },
        ]
      case 'alicloud':
        return [
          {
            label: 'Access Key ID',
            value: decodeBase64(secretData.accessKeyID),
          },
        ]
      case 'metal':
        return [
          {
            label: 'API URL',
            value: decodeBase64(secretData.metalAPIURL),
          },
        ]
      case 'hcloud':
        return [
          {
            label: 'Hetzner Cloud Token',
            hidden: true,
          },
        ]
      case 'openstack-designate':
        return [
          {
            label: 'Domain Name',
            value: decodeBase64(secretData.domainName),
          },
          {
            label: 'Tenant Name',
            value: decodeBase64(secretData.tenantName),
          },
        ]
        // dns
      case 'aws-route53':
        return [
          {
            label: 'Access Key ID',
            value: decodeBase64(secretData.accessKeyID),
          },
        ]
      case 'azure-dns':
      case 'azure-private-dns':
        return [
          {
            label: 'Subscription ID',
            value: decodeBase64(secretData.subscriptionID),
          },
        ]
      case 'google-clouddns':
        return [
          {
            label: 'Project',
            value: decodeBase64(secretData.project),
          },
        ]
      case 'alicloud-dns':
        return [
          {
            label: 'Access Key ID',
            value: decodeBase64(secretData.accessKeyID),
          },
        ]
      case 'infoblox-dns':
        return [
          {
            label: 'Infoblox Username',
            value: decodeBase64(secretData.USERNAME),
          },
        ]
      case 'cloudflare-dns':
        return [
          {
            label: 'API Key',
            hidden: true,
          },
        ]
      case 'netlify-dns':
        return [
          {
            label: 'API Key',
            hidden: true,
          },
        ]
      case 'rfc2136':
        return [
          {
            label: 'Server',
            value: decodeBase64(secretData.Server),
          },
          {
            label: 'TSIG Key Name',
            value: decodeBase64(secretData.TSIGKeyName),
          },
          {
            label: 'Zone',
            value: decodeBase64(secretData.Zone),
          },
        ]
      case 'powerdns':
        return [
          {
            label: 'Server',
            value: decodeBase64(secretData.server),
          },
          {
            label: 'API Key',
            hidden: true,
          },
        ]
      default:
        return undefined
    }
  } catch (err) {
    return undefined
  }
}
