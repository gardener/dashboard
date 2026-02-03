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

import {
  bindingProviderType,
  credentialProviderType,
} from './helper'

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
  const { sortedInfraProviderTypeList } = storeToRefs(cloudProfileStore)

  return computed(() => {
    if (sortedInfraProviderTypeList.value.includes(providerType.value)) {
      return filter(credentialStore.infrastructureBindingList, binding => {
        return bindingProviderType(binding) === providerType.value
      })
    }
    if (dnsProviderTypes.value.includes(providerType.value)) {
      return filter(credentialStore.dnsCredentialList, credential => {
        return credentialProviderType(credential) === providerType.value
      })
    }
    return []
  })
}
