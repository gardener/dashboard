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
import { useCloudProfileStore } from '@/store/cloudProfile'
import { useCredentialStore } from '@/store/credential'

import {
  isSharedCredential as _isSharedCredential,
  isInfrastructureBinding as _isInfrastructureBinding,
  isSecretBinding as _isSecretBinding,
  isCredentialsBinding as _isCredentialsBinding,
  credentialName as _credentialName,
  credentialNamespace as _credentialNameSpace,
  credentialRef as _credentialRef,
  credentialKind as _credentialKind,
  secretDetails as _secretDetails,
} from './helper'

import filter from 'lodash/filter'
import get from 'lodash/get'
import find from 'lodash/find'
export const useCloudProviderBinding = (binding, options = {}) => {
  if (!isRef(binding)) {
    throw new TypeError('First argument `binding` must be a ref object')
  }

  const {
    shootStore = useShootStore(),
    cloudProfileStore = useCloudProfileStore(),
    credentialStore = useCredentialStore(),
  } = options
  const { shootList } = storeToRefs(shootStore)
  const { infrastructureBindingList } = storeToRefs(credentialStore)
  const { sortedProviderTypeList } = storeToRefs(cloudProfileStore)

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
  const hasSecret = computed(() =>
    isSecretBinding.value ||
    (isCredentialsBinding.value && binding.value?.credentialsRef?.kind === 'Secret'),
  )
  const hasWorkloadIdentity = computed(() =>
    isCredentialsBinding.value && binding.value?.credentialsRef?.kind === 'WorkloadIdentity',
  )
  const isInfrastructureBinding = computed(() =>
    _isInfrastructureBinding(binding.value, sortedProviderTypeList.value),
  )
  const isMarkedForDeletion = computed(() =>
    Boolean(binding.value?.metadata.deletionTimestamp),
  )

  // Credential References
  const credentialRef = computed(() => {
    if (isSecretBinding.value || isCredentialsBinding.value) {
      return _credentialRef(binding.value)
    }
    return undefined
  })
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
    if (hasSecret.value) {
      return credentialStore.getSecret(credentialRef.value)
    }
    if (hasWorkloadIdentity.value) {
      return credentialStore.getWorkloadIdentity(credentialRef.value)
    }
    return undefined
  })

  const credentialDetails = computed(() => {
    if (hasSecret.value && credential.value) {
      return _secretDetails(credential.value, binding.value?.provider?.type)
    }
    return undefined
  })

  // Usage & Orphan Detection
  const hasOwnSecret = computed(() =>
    hasSecret.value && credential.value !== undefined,
  )
  const hasOwnWorkloadIdentity = computed(() =>
    hasOwnWorkloadIdentity.value && credential.value !== undefined,
  )
  const isOrphanedBinding = computed(() =>
    !isSharedCredential.value &&
    !hasOwnSecret.value &&
    !hasOwnWorkloadIdentity.value,
  )

  const credentialUsageCount = computed(() => {
    // count shoots referencing this binding by type
    if (!isInfrastructureBinding.value) {
      return 0
    }
    const name = binding.value?.metadata.name
    const shoots = filter(shootList.value, ({ spec }) =>
      isSecretBinding.value
        ? spec.secretBindingName === name
        : isCredentialsBinding.value
          ? spec.credentialsBindingName === name
          : false,
    )
    return shoots.length
  })

  const bindingsWithSameCredential = computed(() =>
    filter(
      infrastructureBindingList.value,
      other => {
        if (other.metadata.uid === binding.value?.metadata.uid) {
          return false
        }
        if (!_isSecretBinding(other) && !_isCredentialsBinding(other)) {
          return false
        }
        const otherRef = _credentialRef(other)
        return otherRef.namespace === credentialRef.value.namespace &&
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
    isInfrastructureBinding,
    isMarkedForDeletion,

    // References & resolved credential
    credentialRef,
    credentialNamespace,
    credentialName,
    credentialKind,
    credential,
    credentialDetails,

    // Usage/orphan checks
    hasOwnSecret,
    hasOwnWorkloadIdentity,
    isOrphanedBinding,
    credentialUsageCount,
    bindingsWithSameCredential,

    // Quotas & lifecycle
    quotas,
    selfTerminationDays,
  }
}
