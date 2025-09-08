//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  isRef,
} from 'vue'
import { storeToRefs } from 'pinia'

import { useShootStore } from '@/store/shoot'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'

import { secretDetails as _secretDetails } from './helper'

import get from 'lodash/get'
import some from 'lodash/some'

export const useDnsCredential = (credential, options = {}) => {
  if (!isRef(credential)) {
    throw new TypeError('First argument `credential` must be a ref object')
  }

  const {
    shootStore = useShootStore(),
    gardenerExtensionStore = useGardenerExtensionStore(),
  } = options
  const { shootList } = storeToRefs(shootStore)
  const { dnsProviderTypes } = storeToRefs(gardenerExtensionStore)

  // Classification Flags
  const isSecret = computed(() =>
    credential.value?.kind === 'Secret',
  )
  const isWorkloadIdentity = computed(() =>
    credential.value?.kind === 'WorkloadIdentity',
  )
  const isMarkedForDeletion = computed(() =>
    Boolean(credential.value?.metadata.deletionTimestamp),
  )

  // Credential References
  const credentialNamespace = computed(() =>
    credential.value?.metadata.namespace,
  )
  const credentialName = computed(() =>
    credential.value?.metadata.name,
  )
  const credentialKind = computed(() =>
    credential.value?.kind,
  )

  // DNS Provider Detection from Labels
  const dnsProviderType = computed(() => {
    const labels = credential.value?.metadata?.labels || {}
    for (const providerType of dnsProviderTypes.value) {
      const labelKey = `provider.shoot.gardener.cloud/${providerType}`
      if (get(labels, [labelKey]) === 'true') {
        return providerType
      }
    }
    return undefined
  })

  const credentialDetails = computed(() => {
    if (isSecret.value && credential.value && dnsProviderType.value) {
      return _secretDetails(credential.value, dnsProviderType.value)
    }
    return undefined
  })

  // Usage Detection
  const credentialUsageCount = computed(() => {
    if (!dnsProviderType.value) {
      return 0
    }

    const byProvider = providers =>
      some(providers, ['secretName', credentialName.value])
    const byResource = resources =>
      some(resources, { resourceRef: { kind: credentialKind.value, name: credentialName.value } })

    let count = 0
    for (const shoot of shootList.value) {
      if (byProvider(shoot.spec.dns?.providers) || byResource(shoot.spec.resources)) {
        count++
      }
    }
    return count
  })

  // Create a binding-like object for compatibility with existing components
  const bindingLike = computed(() => ({
    kind: credentialKind.value,
    metadata: {
      name: credentialName.value,
      namespace: credentialNamespace.value,
      uid: credential.value?.metadata.uid,
      deletionTimestamp: credential.value?.metadata.deletionTimestamp,
    },
    provider: {
      type: dnsProviderType.value,
    },
    // For DNS credentials, the credential reference points to itself
    credentialsRef: isWorkloadIdentity.value
      ? {
          kind: 'WorkloadIdentity',
          name: credentialName.value,
          namespace: credentialNamespace.value,
        }
      : undefined,
    secretRef: isSecret.value
      ? {
          name: credentialName.value,
          namespace: credentialNamespace.value,
        }
      : undefined,
  }))

  return {
    // Classification
    isSecret,
    isWorkloadIdentity,
    isMarkedForDeletion,

    // References & resolved credential
    credentialNamespace,
    credentialName,
    credentialKind,
    credential,
    credentialDetails,
    dnsProviderType,

    // Usage checks
    credentialUsageCount,

    // Compatibility
    bindingLike,

    // DNS-specific flags for compatibility
    isSharedCredential: computed(() => false), // DNS credentials are always project-scoped
    isOrphanedBinding: computed(() => false), // DNS credentials exist as direct resources
    isSecretBinding: computed(() => false),
    isCredentialsBinding: computed(() => false),
    isInfrastructureBinding: computed(() => false),
    isDnsBinding: computed(() => true),
    hasOwnSecret: computed(() => isSecret.value),
    hasOwnWorkloadIdentity: computed(() => isWorkloadIdentity.value),
    bindingsWithSameCredential: computed(() => []), // Not applicable for DNS credentials
    quotas: computed(() => []), // Not applicable for DNS credentials
    selfTerminationDays: computed(() => undefined), // Not applicable for DNS credentials
  }
}
