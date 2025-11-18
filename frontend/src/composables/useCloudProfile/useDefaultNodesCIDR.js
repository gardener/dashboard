//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  isRef,
} from 'vue'

import { useConfigStore } from '@/store/config'

import get from 'lodash/get'

/**
 * Composable for getting default nodes CIDR from cloud profile
 * @param {Ref<CloudProfile>} cloudProfile - Vue ref containing the cloud profile object
 * @returns {Object} Object containing computed property for default nodes CIDR
 */
export function useDefaultNodesCIDR (cloudProfile) {
  if (!isRef(cloudProfile)) {
    throw new Error('cloudProfile must be a ref!')
  }

  const configStore = useConfigStore()

  const defaultNodesCIDR = computed(() => {
    return get(
      cloudProfile.value,
      ['spec', 'providerConfig', 'defaultNodesCIDR'],
      configStore.defaultNodesCIDR,
    )
  })

  return {
    defaultNodesCIDR,
  }
}
