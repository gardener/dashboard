//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import { useCredentialStore } from '@/store/credential'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'

import { hasOwnCredential } from '@/utils'

import filter from 'lodash/filter'

export const useCloudProviderBindingList = (providerType, options = {}) => {
  const {
    credentialStore = useCredentialStore(),
    gardenerExtensionStore = useGardenerExtensionStore(),
  } = options

  return computed(() => {
    const isDnsSecret = gardenerExtensionStore.dnsProviderTypes.includes(providerType.value)
    return filter(credentialStore.cloudProviderBindingList, secretBinding => {
      if (secretBinding.provider?.type !== providerType.value) {
        return false
      }

      return isDnsSecret
        ? hasOwnCredential(secretBinding) // shared dns secret not supported by dns extension
        : true
    })
  })
}
