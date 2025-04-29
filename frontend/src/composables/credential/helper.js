//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

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
