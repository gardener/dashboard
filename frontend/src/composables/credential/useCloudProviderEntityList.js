//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  isRef,
  unref,
} from 'vue'

import { useCredentialStore } from '@/store/credential'

import { getCloudProviderEntityList } from './helper'

export const useCloudProviderEntityList = (providerType, options = {}) => {
  if (!isRef(providerType)) {
    throw new TypeError('First argument `providerType` must be a ref object')
  }

  const {
    credentialStore = useCredentialStore(),
    vendorType,
  } = options

  return computed(() => {
    return getCloudProviderEntityList(providerType.value, {
      credentialStore,
      vendorType: unref(vendorType),
    })
  })
}
