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
  isSharedBinding as _isSharedBinding,
  isInfrastructureBinding as _isInfrastructureBinding,
  isSecretBinding as _isSecretBinding,
  isCredentialsBinding as _isCredentialsBinding,
  bindingCredentialName as _credentialName,
  bindingCredentialNamespace as _credentialNamespace,
  bindingCredentialRef as _bindingCredentialRef,
  bindingCredentialKind as _credentialKind,
  secretDetails as _secretDetails,
  bindingProviderType as _bindingProviderType,
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

  // Resource
  const resourceName = computed(() =>
    get(binding.value, ['metadata', 'name']),
  )
  const resourceNamespace = computed(() =>
    get(binding.value, ['metadata', 'namespace']),
  )
  const resourceUid = computed(() =>
    get(binding.value, ['metadata', 'uid']),
  )
  const resourceKind = computed(() =>
    get(binding.value, ['kind']),
  )

  // Classification Flags
  const isSharedBinding = computed(() =>
    _isSharedBinding(binding.value),
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
    _isInfrastructureBinding({ binding: binding.value, infraProviderTypes: sortedProviderTypeList.value }),
  )
  const isMarkedForDeletion = computed(() =>
    Boolean(binding.value?.metadata.deletionTimestamp),
  )
  const providerType = computed(() =>
    _bindingProviderType(binding.value),
  )

  // Credential References
  const bindingCredentialRef = computed(() => {
    if (isSecretBinding.value || isCredentialsBinding.value) {
      return _bindingCredentialRef(binding.value)
    }
    return undefined
  })
  const credentialNamespace = computed(() =>
    _credentialNamespace(binding.value),
  )
  const credentialName = computed(() =>
    _credentialName(binding.value),
  )

  const credentialKind = computed(() =>
    _credentialKind(binding.value),
  )

  // Resolved Credential Object
  const credential = computed(() => {
    if (hasSecret.value) {
      return credentialStore.getSecret(bindingCredentialRef.value)
    }
    if (hasWorkloadIdentity.value) {
      return credentialStore.getWorkloadIdentity(bindingCredentialRef.value)
    }
    return undefined
  })

  const credentialDetails = computed(() => {
    if (hasSecret.value && credential.value) {
      return _secretDetails({ secret: credential.value, providerType: providerType.value })
    }
    return undefined
  })

  // Usage & Orphan Detection
  const hasOwnSecret = computed(() =>
    hasSecret.value && credential.value !== undefined,
  )
  const hasOwnWorkloadIdentity = computed(() =>
    hasWorkloadIdentity.value && credential.value !== undefined,
  )
  const isOrphanedBinding = computed(() =>
    !isSharedBinding.value &&
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
        const otherRef = _bindingCredentialRef(other)
        return otherRef.namespace === bindingCredentialRef.value.namespace &&
        otherRef.name === bindingCredentialRef.value.name &&
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
    // Resource
    resourceName,
    resourceNamespace,
    resourceUid,
    resourceKind,

    // Classification
    isSharedBinding,
    isSecretBinding,
    isCredentialsBinding,
    isInfrastructureBinding,
    isMarkedForDeletion,
    providerType,

    // References & resolved credential
    bindingCredentialRef,
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
