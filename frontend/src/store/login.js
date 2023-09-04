//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  ref,
  watch,
} from 'vue'
import { defineStore } from 'pinia'

import { useLogger } from '@/composables/useLogger'

export const useLoginStore = defineStore('login', () => {
  const logger = useLogger()

  const url = import.meta.env.BASE_URL + 'login-config.json'

  const isFetching = ref(true)
  const loginError = ref(null)
  const loginType = ref('token')
  const loginTypes = ref(['token'])
  const landingPageUrl = ref('')

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

  function isNotFetching () {
    const executor = resolve => {
      watch(isFetching, value => {
        if (!value) {
          resolve()
        }
      })
    }
    return !isFetching.value
      ? Promise.resolve()
      : new Promise(executor)
  }

  return {
    isFetching,
    loginError,
    loginType,
    loginTypes,
    landingPageUrl,
    isNotFetching,
  }
})
