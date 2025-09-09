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
  credentialName as _credentialName,
  credentialNamespace as _credentialNamespace,
  credentialKind as _credentialKind,
  secretDetails as _secretDetails,
  getProviderType as _getProviderType,
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

  const credentialNamespace = computed(() => _credentialNamespace(credential.value))
  const credentialName = computed(() => _credentialName(credential.value))
  const credentialKind = computed(() => _credentialKind(credential.value))
  const providerType = computed(() => _getProviderType(credential.value))

  const credentialDetails = computed(() => {
    if (isSecret.value) {
      return _secretDetails(credential.value, providerType.value)
    }
    return undefined
  })

  const credentialUsageCount = computed(() => {
    const name = credentialName.value
    const kind = credentialKind.value || 'Secret'
    const byProvider = providers => some(providers, ['secretName', name])
    const byResource = resources => some(resources, { resourceRef: { kind, name } })

    let count = 0
    for (const shoot of shootList.value) {
      if (byProvider(shoot.spec?.dns?.providers) || byResource(shoot.spec?.resources)) {
        count++
      }
    }
    return count
  })

  const isMarkedForDeletion = computed(() => Boolean(credential.value?.metadata.deletionTimestamp))

  return {
    credential,
    credentialNamespace,
    credentialName,
    credentialKind,
    credentialDetails,
    credentialUsageCount,
    isMarkedForDeletion,
  }
}
