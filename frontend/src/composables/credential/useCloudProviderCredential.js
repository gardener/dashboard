//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  isRef,
} from 'vue'
import { storeToRefs } from 'pinia'

import { useShootStore } from '@/store/shoot'

import {
  isSecret as _isSecret,
  secretDetails as _secretDetails,
  credentialProviderType as _credentialProviderType,
} from './helper'

import some from 'lodash/some'
export const useCloudProviderCredential = (credential, options = {}) => {
  if (!isRef(credential)) {
    throw new TypeError('First argument `credential` must be a ref object')
  }

  const {
    shootStore = useShootStore(),
  } = options
  const { shootList } = storeToRefs(shootStore)

  const isSecret = computed(() => _isSecret(credential.value))

  const credentialNamespace = computed(() => credential.value?.metadata?.namespace)
  const credentialName = computed(() => credential.value?.metadata?.name)
  const credentialKind = computed(() => credential.value?.kind)
  const providerType = computed(() => _credentialProviderType(credential.value))
  const resourceUid = computed(() => credential.value?.metadata?.uid)

  const credentialDetails = computed(() => {
    if (isSecret.value) {
      return _secretDetails({ secret: credential.value, providerType: providerType.value })
    }
    return undefined
  })

  const credentialUsageCount = computed(() => {
    const name = credentialName.value
    const kind = credentialKind.value
    const isCredentialReferencedByDnsProvider = shoot => some(shoot.spec?.dns?.providers, provider => {
      if (provider?.credentialsRef) {
        return provider.credentialsRef.name === name && provider.credentialsRef.kind === kind
      }
      // secretName is supported for backward compatibility, but credentialsRef is preferred if both are set
      return kind === 'Secret' && provider?.secretName === name
    })
    const isCredentialReferencedByResource = shoot => some(shoot.spec?.resources, { resourceRef: { kind, name } })

    let count = 0
    for (const shoot of shootList.value) {
      if (isCredentialReferencedByDnsProvider(shoot) || isCredentialReferencedByResource(shoot)) {
        count++
      }
    }
    return count
  })

  const isMarkedForDeletion = computed(() => Boolean(credential.value?.metadata.deletionTimestamp))

  return {
    // Resource
    resourceName: credentialName,
    resourceNamespace: credentialNamespace,
    resourceKind: credentialKind,
    resourceUid,

    // Credential
    credential,
    credentialNamespace,
    credentialName,
    credentialKind,
    credentialDetails,
    credentialUsageCount,
    isMarkedForDeletion,
    providerType,
  }
}
