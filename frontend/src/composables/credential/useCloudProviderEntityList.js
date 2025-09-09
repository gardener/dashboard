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

import { useCredentialStore } from '@/store/credential'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useCloudProfileStore } from '@/store/cloudProfile'

import { getProviderType } from './helper'

import filter from 'lodash/filter'

export const useCloudProviderEntityList = (providerType, options = {}) => {
  if (!isRef(providerType)) {
    throw new TypeError('First argument `providerType` must be a ref object')
  }

  const {
    credentialStore = useCredentialStore(),
    gardenerExtensionStore = useGardenerExtensionStore(),
    cloudProfileStore = useCloudProfileStore(),
  } = options

  const { dnsProviderTypes } = storeToRefs(gardenerExtensionStore)
  const { sortedProviderTypeList } = storeToRefs(cloudProfileStore)

  return computed(() => {
    if (sortedProviderTypeList.value.includes(providerType.value)) {
      return filter(credentialStore.infrastructureBindingList, binding => {
        return getProviderType(binding) === providerType.value
      })
    }
    if (dnsProviderTypes.value.includes(providerType.value)) {
      return filter(credentialStore.dnsCredentialList, credential => {
        return getProviderType(credential) === providerType.value
      })
    }
    return []
  })
}
