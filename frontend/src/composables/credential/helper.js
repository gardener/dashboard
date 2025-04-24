//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export function isSharedCredential (binding) {
  const bindingNamespace = binding.metadata.namespace
  let refNamespace
  if (binding._isSecretBinding) {
    refNamespace = binding.secretRef.namespace
  } else if (binding._isCredentialsBinding) {
    refNamespace = binding.credentialsRef.namespace
  }

  return refNamespace !== bindingNamespace
}
