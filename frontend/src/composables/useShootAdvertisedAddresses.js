//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  isRef,
} from 'vue'

import filter from 'lodash/filter'
import get from 'lodash/get'
import head from 'lodash/head'

export function useShootAdvertisedAddresses (shootItem) {
  if (!isRef(shootItem)) {
    throw new TypeError('First argument `shootItem` must be a ref object')
  }

  const shootAdvertisedAddresses = computed(() => {
    return get(shootItem.value, ['status', 'advertisedAddresses'], [])
  })

  function useAdvertisedAddressesForApplication (applicationName) {
    const advertisedAddresses = computed(() => {
      return filter(shootAdvertisedAddresses.value, { application: applicationName })
    })

    const url = computed(() => {
      const advertisedAddress = head(advertisedAddresses.value)
      return advertisedAddress?.url
    })

    return {
      advertisedAddresses,
      url,
    }
  }

  const {
    advertisedAddresses: shootPlutonoAdvertisedAddresses,
    url: shootPlutonoUrl,
  } = useAdvertisedAddressesForApplication('credativ--plutono')
  const {
    advertisedAddresses: shootPrometheusAdvertisedAddresses,
    url: shootPrometheusUrl,
  } = useAdvertisedAddressesForApplication('prometheus--prometheus')

  return {
    shootAdvertisedAddresses,
    shootPlutonoAdvertisedAddresses,
    shootPrometheusAdvertisedAddresses,
    shootPlutonoUrl,
    shootPrometheusUrl,
    useAdvertisedAddressesForApplication,
  }
}
