//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineStore,
  acceptHMRUpdate,
} from 'pinia'
import {
  ref,
  computed,
} from 'vue'

import { useLogger } from '@/composables/useLogger'
import { useInterceptors } from '@/composables/useApi'

import {
  gravatarUrlGeneric,
  displayName as getDisplayName,
  fullDisplayName as getFullDisplayName,
} from '@/utils'
import { createAbortError } from '@/utils/errors'

import { useUserManager } from './helper'

export const useAuthnStore = defineStore('authn', () => {
  const logger = useLogger()
  const {
    decodeCookie,
    isExpired,
    signin,
    signout,
    signinWithOidc,
    ensureValidToken,
  } = useUserManager({
    logger,
  })

  const interceptors = useInterceptors()

  interceptors.register({
    async requestFulfilled (...args) {
      const url = args[0] ?? ''
      if (url.startsWith('/api')) {
        try {
          await ensureValidToken()
        } catch (err) {
          logger.error(err)
          throw createAbortError('Request aborted')
        }
      }
      return args
    },
  })

  const user = ref(null)

  const isAdmin = computed(() => {
    return user.value?.isAdmin === true
  })

  const username = computed(() => {
    return user.value?.email ?? user.value?.id ?? ''
  })

  const displayName = computed(() => {
    return user.value?.name ?? getDisplayName(user.value?.id) ?? ''
  })

  const fullDisplayName = computed(() => {
    return user.value?.name ?? getFullDisplayName(user.value?.id) ?? ''
  })

  const userExpiresAt = computed(() => {
    return (user.value?.exp ?? 0) * 1000
  })

  const avatarUrl = computed(() => {
    return gravatarUrlGeneric(username.value)
  })

  const avatarTitle = computed(() => {
    return `${displayName.value} (${username.value})`
  })

  function $reset () {
    user.value = decodeCookie()
  }

  return {
    user,
    isAdmin,
    username,
    displayName,
    fullDisplayName,
    userExpiresAt,
    avatarUrl,
    avatarTitle,
    isExpired,
    signout,
    signin,
    signinWithOidc,
    ensureValidToken,
    $reset,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthnStore, import.meta.hot))
}
