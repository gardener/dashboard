//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  isRef,
} from 'vue'

import { useShootStore } from '@/store/shoot'
import { useCloudProfileStore } from '@/store/cloudProfile'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useCredentialStore } from '@/store/credential'

import {
  isSharedCredential as _isSharedCredential,
  isInfrastructureBinding as _isInfrastructureBinding,
  isDnsBinding as _isDnsBinding,
  isSecretBinding as _isSecretBinding,
  isCredentialsBinding as _isCredentialsBinding,
  credentialName as _credentialName,
  credentialNamespace as _credentialNameSpace,
  credentialRef as _credentialRef,
  credentialKind as _credentialKind,
} from './helper'

import filter from 'lodash/filter'
import some from 'lodash/some'
import get from 'lodash/get'
import find from 'lodash/find'

export const useCloudProviderBinding = (binding, options = {}) => {
  if (!isRef(binding)) {
    throw new TypeError('First argument `binding` must be a ref object')
  }

  const {
    shootStore = useShootStore(),
    cloudProfileStore = useCloudProfileStore(),
    gardenerExtensionStore = useGardenerExtensionStore(),
    credentialStore = useCredentialStore(),
  } = options
  const shootList = shootStore.shootList

  // Classification Flags
  const isSharedCredential = computed(() =>
    _isSharedCredential(binding.value),
  )
  const isSecretBinding = computed(() =>
    _isSecretBinding(binding.value),
  )
  const isCredentialsBinding = computed(() =>
    _isCredentialsBinding(binding.value),
  )
  const isSecret = computed(() =>
    isSecretBinding.value ||
    binding.value?.credentialsRef?.kind === 'Secret',
  )
  const isWorkloadIdentity = computed(() =>
    isCredentialsBinding.value &&
    binding.value?.credentialsRef?.kind === 'WorkloadIdentity',
  )
  const isInfrastructureBinding = computed(() =>
    _isInfrastructureBinding(binding.value, cloudProfileStore),
  )
  const isDnsBinding = computed(() =>
    _isDnsBinding(binding.value, gardenerExtensionStore),
  )
  const isMarkedForDeletion = computed(() =>
    Boolean(binding.value?.metadata.deletionTimestamp),
  )

  // Credential References
  const credentialRef = computed(() =>
    _credentialRef(binding.value),
  )
  const credentialNamespace = computed(() =>
    _credentialNameSpace(binding.value),
  )
  const credentialName = computed(() =>
    _credentialName(binding.value, true),
  )

  const credentialKind = computed(() =>
    _credentialKind(binding.value),
  )

  // Resolved Credential Object
  const credential = computed(() => {
    if (isSecret.value) {
      return credentialStore.getSecret(credentialRef.value)
    }
    if (isWorkloadIdentity.value) {
      return credentialStore.getWorkloadIdentity(credentialRef.value)
    }
    return undefined
  })

  // Usage & Orphan Detection
  const hasOwnSecret = computed(() =>
    isSecret.value && credential.value !== undefined,
  )
  const hasOwnWorkloadIdentity = computed(() =>
    isWorkloadIdentity.value && credential.value !== undefined,
  )
  const isOrphanedCredential = computed(() =>
    !isSharedCredential.value &&
    !hasOwnSecret.value &&
    !hasOwnWorkloadIdentity.value,
  )

  const credentialUsageCount = computed(() => {
    // count shoots referencing this binding by type
    if (isInfrastructureBinding.value) {
      const name = binding.value?.metadata.name
      const shoots = filter(shootList, ({ spec }) =>
        isSecretBinding.value
          ? spec.secretBindingName === name
          : isCredentialsBinding.value
            ? spec.credentialsBindingName === name
            : false,
      )
      return shoots.length
    }
    if (isDnsBinding.value) {
      if (isSharedCredential.value === undefined) {
        return 0 // dns extension currently supports secrets only (no bindings)
      }
      const byProvider = providers =>
        some(providers, ['secretName', credentialName.value])
      const byResource = resources =>
        some(resources, { resourceRef: { kind: 'Secret', name: credentialName.value } })

      let count = 0
      for (const shoot of shootList) {
        if (byProvider(shoot.spec.dns?.providers) || byResource(shoot.spec.resources)) {
          count++
        }
      }
      return count
    }
    return 0
  })

  const bindingsWithSameCredential = computed(() =>
    filter(
      credentialStore.cloudProviderBindingList,
      other => {
        const otherRef = _credentialRef(other)
        return other.metadata.uid !== binding.value?.metadata.uid &&
        otherRef.namespace === credentialRef.value.namespace &&
        otherRef.name === credentialRef.value.name &&
        (otherRef.kind ?? 'Secret') === credentialKind.value
      },
    ),
  )

  // Quotas & Lifecycles
  const quotas = computed(() =>
    (binding.value?.quotas || [])
      .map(credentialStore.getQuota)
      .filter(Boolean),
  )

  const selfTerminationDays = computed(() => {
    const findScope = scope =>
      get(find(quotas.value, scope), ['spec', 'clusterLifetimeDays'])

    return (
      findScope({ spec: { scope: { apiVersion: 'core.gardener.cloud/v1beta1', kind: 'Project' } } }) ||
      findScope({ spec: { scope: { apiVersion: 'v1', kind: 'Secret' } } })
    )
  })

  return {
    // Classification
    isSharedCredential,
    isSecretBinding,
    isCredentialsBinding,
    isSecret,
    isWorkloadIdentity,
    isInfrastructureBinding,
    isDnsBinding,
    isMarkedForDeletion,

    // References & resolved credential
    credentialRef,
    credentialNamespace,
    credentialName,
    credentialKind,
    credential,

    // Usage/orphan checks
    hasOwnSecret,
    hasOwnWorkloadIdentity,
    isOrphanedCredential,
    credentialUsageCount,
    bindingsWithSameCredential,

    // Quotas & lifecycle
    quotas,
    selfTerminationDays,
  }
}
