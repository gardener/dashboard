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
import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useCredentialStore } from '@/store/credential'

import { decodeBase64 } from '@/utils'

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
  secretDetails as _secretDetails,
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
  const { shootList } = storeToRefs(shootStore)
  const { cloudProviderBindingList } = storeToRefs(credentialStore)
  const { sortedProviderTypeList } = storeToRefs(cloudProfileStore)
  const { dnsProviderTypes } = storeToRefs(gardenerExtensionStore)

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
    _isInfrastructureBinding(binding.value, sortedProviderTypeList.value),
  )
  const isDnsBinding = computed(() =>
    _isDnsBinding(binding.value, dnsProviderTypes.value),
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

  const credentialDetails = computed(() => {
    if (isSecret.value && credential.value) {
      return _secretDetails(credential.value, binding.value?.provider?.type)
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
      const shoots = filter(shootList.value, ({ spec }) =>
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
      for (const shoot of shootList.value) {
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
      cloudProviderBindingList.value,
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

  const openStackDomainName = computed(() => {
    if (binding.value?.provider?.type !== 'openstack' || !hasOwnSecret.value) {
      return undefined
    }
    const domainName = get(credential.value, ['data', 'domainName'])
    return domainName ? decodeBase64(domainName) : undefined
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
    credentialDetails,

    // Usage/orphan checks
    hasOwnSecret,
    hasOwnWorkloadIdentity,
    isOrphanedCredential,
    credentialUsageCount,
    bindingsWithSameCredential,

    // Quotas & lifecycle
    quotas,
    selfTerminationDays,

    // Other
    openStackDomainName,
  }
}
