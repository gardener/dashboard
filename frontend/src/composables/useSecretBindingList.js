//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import { useCredentialStore } from '@/store/credential'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'

import { isOwnSecret } from '@/utils'

import filter from 'lodash/filter'

export const useSecretBindingList = (providerType, options = {}) => {
  const {
    secretStore = useCredentialStore(),
    gardenerExtensionStore = useGardenerExtensionStore(),
  } = options

  return computed(() => {
    const isDnsSecret = gardenerExtensionStore.dnsProviderTypes.includes(providerType.value)
    return filter(secretStore.secretBindingList, secretBinding => {
      if (secretBinding.provider?.type !== providerType.value) {
        return false
      }

      return isDnsSecret
        ? isOwnSecret(secretBinding) // shared dns secret not supported by dns extension
        : true
    })
  })
}
