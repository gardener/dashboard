//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//
import { computed } from 'vue'

import { useLocalStorageStore } from '@/store/localStorage'
import { useConfigStore } from '@/store/config'

import {
  last,
  head,
} from '@/lodash'

const defaultExpirations = [600, 1800, 3600, 10800, 21600, 43200, 86400, 259200, 604800]
const defaultMaxExpiration = 2592000

export const useShootAdminKubeconfig = () => {
  const localStorageStore = useLocalStorageStore()
  const configStore = useConfigStore()
  const isEnabled = computed(() => {
    return configStore.shootAdminKubeconfig?.enabled ?? false
  })
  const maxExpiration = computed(() => {
    return configStore.shootAdminKubeconfig?.maxExpirationSeconds ?? defaultMaxExpiration
  })
  const expiration = computed({
    get () {
      const value = localStorageStore.shootAdminKubeconfigExpiration
      return !value
        ? head(expirations.value)
        : Math.min(value, last(expirations.value))
    },
    set (value) {
      localStorageStore.shootAdminKubeconfigExpiration = value
    },
  })
  const expirations = computed(() => {
    return defaultExpirations.filter(value => value <= maxExpiration.value)
  })
  function humanizeExpiration (value) {
    if (value < 3600) {
      return `${Math.floor(value / 60)}m`
    }
    if (value < 86400) {
      return `${Math.floor(value / 3600)}h`
    }
    return `${Math.floor(value / 86400)}d`
  }

  return {
    expiration,
    isEnabled,
    expirations,
    humanizeExpiration,
  }
}
