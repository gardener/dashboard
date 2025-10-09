//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useCredentialStore } from '@/store/credential'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'

import {
  isDnsBinding,
  isSharedCredential,
} from './helper'

import filter from 'lodash/filter'

export const useCloudProviderBindingList = (providerType, options = {}) => {
  const {
    credentialStore = useCredentialStore(),
    gardenerExtensionStore = useGardenerExtensionStore(),
  } = options

  const { dnsProviderTypes } = storeToRefs(gardenerExtensionStore)

  return computed(() => {
    return filter(credentialStore.cloudProviderBindingList, binding => {
      if (binding.provider?.type !== providerType.value) {
        return false
      }
      if (isDnsBinding(binding, dnsProviderTypes.value)) {
        return !isSharedCredential(binding) // dns extension currently supports secrets only (no bindings)
      }
      return true
    })
  })
}
