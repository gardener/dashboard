//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import { useCredentialStore } from '@/store/credential'

import { isSharedCredential } from '@/utils'

import filter from 'lodash/filter'

export const useCloudProviderBindingList = (providerType, options = {}) => {
  const {
    credentialStore = useCredentialStore(),
  } = options

  return computed(() => {
    return filter(credentialStore.cloudProviderBindingList, binding => {
      if (binding.provider?.type !== providerType.value) {
        return false
      }
      if (binding._isDnsBinding) {
        return !isSharedCredential(binding) // shared dns secret not supported by dns extension
      }
      return true
    })
  })
}
