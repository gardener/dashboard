//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'
import { createGlobalState } from '@vueuse/core'
import { useToken } from './useToken'
import {
  gravatarUrlGeneric,
  displayName as getDisplayName,
  fullDisplayName as getFullDisplayName,
} from '@/utils'

export const useUser = createGlobalState(() => {
  const token = useToken()

  const user = computed(() => token.payload.value)

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

  return {
    user,
    isAdmin,
    username,
    displayName,
    fullDisplayName,
    userExpiresAt,
    avatarUrl,
    avatarTitle,
  }
})
