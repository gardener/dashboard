//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import {
  ref,
  computed,
} from 'vue'
import { useLocalStorage } from '@vueuse/core'

import { useLogger } from '@/composables'

export const useLoginStore = defineStore('login', () => {
  const logger = useLogger()
  const autoLogin = useLocalStorage('global/auto-login')

  const url = import.meta.env.BASE_URL + 'login-config.json'

  const isFetching = ref(true)
  const loginError = ref(null)
  const loginType = ref('token')
  const loginTypes = ref(['token'])
  const landingPageUrl = ref('')

  const autoLoginEnabled = computed(() => {
    return autoLogin.value === 'enabled'
  })

  const fetchLoginConfig = async url => {
    try {
      const response = await fetch(url, {
        mode: 'no-cors',
        cache: 'no-cache',
      })
      const data = await response.json()
      loginTypes.value = data.loginTypes
      landingPageUrl.value = data.landingPageUrl
    } catch (err) {
      logger.error('Failed to fetch login configuration: %s', err.message)
      loginTypes.value = ['token']
    } finally {
      loginType.value = loginTypes.value[0]
      isFetching.value = false
    }
  }

  fetchLoginConfig(url)

  return {
    isFetching,
    loginError,
    loginType,
    loginTypes,
    landingPageUrl,
    autoLoginEnabled,
  }
})
