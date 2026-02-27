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

import { decodeBase64 } from '@/utils'

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
  const { sortedInfraProviderTypeList } = storeToRefs(cloudProfileStore)

  // Resource
  const resourceName = computed(() => {
    return get(binding.value, ['metadata', 'name'])
  })
  const resourceNamespace = computed(() => {
    return get(binding.value, ['metadata', 'namespace'])
  })
  const resourceUid = computed(() => {
    return get(binding.value, ['metadata', 'uid'])
  })
  const resourceKind = computed(() => {
    return get(binding.value, ['kind'])
  })

  // Classification Flags
  const isSharedBinding = computed(() => {
    return _isSharedBinding(binding.value)
  })
  const isSecretBinding = computed(() => {
    return _isSecretBinding(binding.value)
  })
  const isCredentialsBinding = computed(() => {
    return _isCredentialsBinding(binding.value)
  })
  const hasSecret = computed(() => {
    return isSecretBinding.value ||
      (isCredentialsBinding.value && binding.value?.credentialsRef?.kind === 'Secret')
  })
  const hasWorkloadIdentity = computed(() => {
    return isCredentialsBinding.value && binding.value?.credentialsRef?.kind === 'WorkloadIdentity'
  })
  const isInfrastructureBinding = computed(() => {
    return _isInfrastructureBinding({ binding: binding.value, infraProviderTypes: sortedInfraProviderTypeList.value })
  })
  const isMarkedForDeletion = computed(() => {
    return Boolean(binding.value?.metadata.deletionTimestamp)
  })
  const providerType = computed(() => {
    return _bindingProviderType(binding.value)
  })

  // Credential References
  const bindingCredentialRef = computed(() => {
    if (isSecretBinding.value || isCredentialsBinding.value) {
      return _bindingCredentialRef(binding.value)
    }
    return undefined
  })
  const credentialNamespace = computed(() => {
    return _credentialNamespace(binding.value)
  })
  const credentialName = computed(() => {
    return _credentialName(binding.value)
  })

  const credentialKind = computed(() => {
    return _credentialKind(binding.value)
  })

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
  const hasOwnSecret = computed(() => {
    return hasSecret.value && credential.value !== undefined
  })
  const hasOwnWorkloadIdentity = computed(() => {
    return hasWorkloadIdentity.value && credential.value !== undefined
  })
  const isOrphanedBinding = computed(() => {
    return !isSharedBinding.value &&
      !hasOwnSecret.value &&
      !hasOwnWorkloadIdentity.value
  })

  const shootsUsingThisCredential = computed(() => {
    if (!isInfrastructureBinding.value) {
      return []
    }
    const name = binding.value?.metadata.name

    let bindingNameKey
    if (isSecretBinding.value) {
      bindingNameKey = 'secretBindingName'
    } else if (isCredentialsBinding.value) {
      bindingNameKey = 'credentialsBindingName'
    } else {
      return []
    }

    const shoots = filter(
      shootList.value,
      ({ spec }) => get(spec, [bindingNameKey]) === name,
    )
    return shoots
  })

  const credentialUsageCount = computed(() => {
    return shootsUsingThisCredential.value.length
  })

  const bindingsWithSameCredential = computed(() => {
    const currentUid = binding.value?.metadata.uid
    const currentRef = bindingCredentialRef.value
    const currentKind = credentialKind.value

    if (!currentRef) {
      return []
    }

    return filter(infrastructureBindingList.value, other => {
      if (other.metadata.uid === currentUid) {
        return false
      }
      if (!_isSecretBinding(other) && !_isCredentialsBinding(other)) {
        return false
      }
      const otherRef = _bindingCredentialRef(other)
      const otherKind = otherRef.kind ?? 'Secret'
      const selectedKind = currentKind ?? 'Secret'

      return otherRef.namespace === currentRef.namespace &&
        otherRef.name === currentRef.name &&
        otherKind === selectedKind
    })
  })

  const credentialsBindingNamesForSecretBinding = computed(() => {
    if (!isSecretBinding.value) {
      return []
    }
    return bindingsWithSameCredential.value
      .filter(binding => binding.kind === 'CredentialsBinding')
      .map(binding => binding.metadata.name)
  })

  // Quotas & Lifecycles
  const quotas = computed(() => {
    return (binding.value?.quotas || [])
      .map(credentialStore.getQuota)
      .filter(Boolean)
  })

  const selfTerminationDays = computed(() => {
    const findScope = scope => {
      return get(find(quotas.value, scope), ['spec', 'clusterLifetimeDays'])
    }
    return (
      findScope({ spec: { scope: { apiVersion: 'core.gardener.cloud/v1beta1', kind: 'Project' } } }) ||
      findScope({ spec: { scope: { apiVersion: 'v1', kind: 'Secret' } } })
    )
  })

  const openStackDomainName = computed(() => {
    if (providerType.value !== 'openstack' || !hasOwnSecret.value) {
      return undefined
    }
    const domainName = get(credential.value, ['data', 'domainName'])
    return domainName ? decodeBase64(domainName) : undefined
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
    shootsUsingThisCredential,
    bindingsWithSameCredential,

    // For SecretBinding migration purpose
    credentialsBindingNamesForSecretBinding,

    // Quotas & lifecycle
    quotas,
    selfTerminationDays,

    // Other
    openStackDomainName,
  }
}
