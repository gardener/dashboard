//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useFetch, useLocalStorage } from '@vueuse/core'
import { useLogger } from '@/composables/useLogger'

export const useLoginStore = defineStore('login', () => {
  const logger = useLogger()
  const autoLogin = useLocalStorage('global/auto-login')

  const loginError = ref(null)
  const loginType = ref()
  const loginTypes = ref([])
  const landingPageUrl = ref('')

  const autoLoginEnabled = computed(() => {
    return autoLogin.value === 'enabled'
  })

  const url = import.meta.env.BASE_URL + 'login-config.json'
  const { isFetching, error, data } = useFetch(url).get().json()
  const unwatch = watch(isFetching, value => {
    if (!value) {
      unwatch()
      if (data.value) {
        loginTypes.value = data.value.loginTypes
        loginType.value = loginTypes.value[0]
        landingPageUrl.value = data.value.landingPageUrl
      }
      if (error.value) {
        logger.error('Failed to fetch login configuration: %s', error.value.message)
        loginTypes.value = ['token']
        loginType.value = loginTypes.value[0]
      }
    }
  })

  return {
    loginError,
    loginType,
    loginTypes,
    landingPageUrl,
    autoLoginEnabled,
  }
})
