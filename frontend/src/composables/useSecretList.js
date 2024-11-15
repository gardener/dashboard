//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import { useSecretStore } from '@/store/secret'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'

import { isOwnSecret } from '@/utils'

import filter from 'lodash/filter'

export const useSecretList = (providerType, options = {}) => {
  const {
    secretStore = useSecretStore(),
    gardenerExtensionStore = useGardenerExtensionStore(),
  } = options

  return computed(() => {
    const isDnsSecret = gardenerExtensionStore.dnsProviderTypes.includes(providerType.value)
    return filter(secretStore.list, secret => {
      if (secret.metadata.provider?.type !== providerType.value) {
        return false
      }

      return isDnsSecret
        ? isOwnSecret(secret) // shared dns secret not supported by dns extension
        : true
    })
  })
}
