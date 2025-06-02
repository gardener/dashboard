//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { decodeBase64 } from '@/utils'

import get from 'lodash/get'

export function isSecretBinding (binding) {
  return binding?.kind === 'SecretBinding'
}
export function isCredentialsBinding (binding) {
  return binding?.kind === 'CredentialsBinding'
}

export function credentialRef (binding) {
  if (isSecretBinding(binding)) {
    return binding?.secretRef
  }
  if (isCredentialsBinding(binding)) {
    return binding?.credentialsRef
  }
  return undefined
}

export function credentialName (binding) {
  return credentialRef(binding)?.name
}

export function credentialNamespace (binding) {
  return credentialRef(binding)?.namespace
}

export function isSharedCredential (binding) {
  const bindingNamespace = binding?.metadata.namespace

  return credentialNamespace(binding) !== bindingNamespace
}

export function credentialKind (binding) {
  if (isSecretBinding(binding)) {
    return 'Secret'
  }
  if (isCredentialsBinding(binding)) {
    return binding?.credentialsRef?.kind
  }
  return undefined
}

export function isInfrastructureBinding (binding, sortedProviderTypeList) {
  return sortedProviderTypeList.includes(binding?.provider?.type)
}
export function isDnsBinding (binding, dnsProviderTypes) {
  return dnsProviderTypes.includes(binding?.provider?.type)
}

export function secretDetails (secret, providerType) {
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
