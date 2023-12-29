//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { useLocalStorageStore } from '@/store/localStorage'
import { useConfigStore } from '@/store/config'

import {
  last,
  head,
} from '@/lodash'
export const useShootAdminKubeconfig = () => {
  const localStorageStore = useLocalStorageStore()
  const configStore = useConfigStore()

  const { shootAdminKubeconfigExpiration } = storeToRefs(localStorageStore)
  const { shootAdminKubeconfig } = storeToRefs(configStore)

  const expiration = computed({
    get () {
      if (shootAdminKubeconfig.value?.maxExpirationSeconds &&
        shootAdminKubeconfigExpiration.value > shootAdminKubeconfig.value?.maxExpirationSeconds) {
        return last(expirations.value)
      }
      if (!shootAdminKubeconfigExpiration.value) {
        return head(expirations.value)
      }
      return shootAdminKubeconfigExpiration.value
    },
    set (value) {
      shootAdminKubeconfigExpiration.value = value
    },
  })

  const isEnabled = computed(() => {
    return shootAdminKubeconfig.value?.enabled
  })

  const kubeconfigExpirations = [600, 1800, 3600, 10800, 21600, 43200, 86400, 259200, 604800]

  const expirations = computed(() => {
    if (shootAdminKubeconfig.value?.maxExpirationSeconds) {
      return kubeconfigExpirations.filter(value => value <= shootAdminKubeconfig.value?.maxExpirationSeconds)
    }
    return kubeconfigExpirations
  })

  const humanizeExpiration = (val) => {
    if (val < 3600) {
      return `${Math.floor(val / 60)}m`
    }
    if (val < 86400) {
      return `${Math.floor(val / 3600)}h`
    }
    return `${Math.floor(val / 86400)}d`
  }

  return {
    expiration,
    isEnabled,
    expirations,
    humanizeExpiration,
  }
}
