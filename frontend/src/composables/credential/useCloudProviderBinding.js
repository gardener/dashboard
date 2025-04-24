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

import { isSharedCredential as _isSharedCredential } from './helper'

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
  } = options
  const shootList = shootStore.shootList

  const isSharedCredential = computed(() => {
    return _isSharedCredential(binding.value)
  })

  const hasOwnSecret = computed(() => binding.value._secret !== undefined)
  const hasOwnWorkloadIdentity = computed(() => binding.value._workloadIdentity !== undefined)
  const isOrphanedCredential = computed(() => !isSharedCredential.value && !hasOwnSecret.value && !hasOwnWorkloadIdentity.value)
  const isMarkedForDeletion = computed(() => !!binding.value.metadata.deletionTimestamp)

  const credentialUseCount = computed(() => {
    if (binding.value._isInfrastructureBinding) {
      const bindingName = binding.value.metadata.name
      const shootsByInfrastructureBinding = filter(shootList, ({ spec }) => {
        if (binding.value._isSecretBinding) {
          return spec.secretBindingName === bindingName
        } else if (binding.value._isCredentialsBinding) {
          return spec.credentialsBindingName === bindingName
        }
        return false
      })
      return shootsByInfrastructureBinding.length
    } else if (binding.value._isDnsBinding) {
      if (!binding.value._secretName) {
        return 0 // currently DNS provider only allows to reference secrets directly
      }
      const someDnsProviderHasSecretRef = providers => some(providers, ['secretName', binding.value._secretName])
      const someResourceHasSecretRef = resources => some(resources, { resourceRef: { kind: 'Secret', name: binding.value._secretName } })

      let count = 0
      for (const shoot of shootList) {
        const dnsProviders = shoot.spec.dns?.providers
        const resources = shoot.spec.resources
        if (someDnsProviderHasSecretRef(dnsProviders) || someResourceHasSecretRef(resources)) {
          count++
        }
      }
      return count
    }
    return 0
  })

  const credentialNamespace = computed(() => binding.value._isSecretBinding ? binding.value.secretRef.namespace : binding.value.credentialsRef.namespace)
  const credentialName = computed(() => binding.value._isSecretBinding ? binding.value.secretRef.name : binding.value.credentialsRef.name)

  const selfTerminationDays = computed(() => {
    const clusterLifetimeDays = function (quotas, scope) {
      return get(find(quotas, scope), ['spec', 'clusterLifetimeDays'])
    }

    const quotas = get(binding.value, ['_quotas'])
    let terminationDays = clusterLifetimeDays(quotas, { spec: { scope: { apiVersion: 'core.gardener.cloud/v1beta1', kind: 'Project' } } })
    if (!terminationDays) {
      terminationDays = clusterLifetimeDays(quotas, { spec: { scope: { apiVersion: 'v1', kind: 'Secret' } } })
    }

    return terminationDays
  })
  return {
    isSharedCredential,
    hasOwnSecret,
    hasOwnWorkloadIdentity,
    isOrphanedCredential,
    credentialUseCount,
    isMarkedForDeletion,
    credentialNamespace,
    credentialName,
    selfTerminationDays,
  }
}
