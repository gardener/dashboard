//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  ref,
  computed,
  unref,
  watchEffect,
} from 'vue'

import { useConfigStore } from '@/store/config'

import { gravatarUrlGeneric } from '@/utils'

import get from 'lodash/get'

const AvatarSourceEnum = {
  GITHUB: 'github',
  GRAVATAR: 'gravatar',
  NONE: 'none',
}

export function useTicketAvatar (username, githubAvatarUrl, size = 128) {
  const configStore = useConfigStore()
  const avatarUrl = ref(undefined)

  const ticketConfig = computed(() => configStore.ticket)

  const avatarSource = computed(() => {
    return get(ticketConfig.value, ['avatarSource'], AvatarSourceEnum.GITHUB)
  })

  const placeholderIcon = computed(() => 'mdi-comment-outline')

  watchEffect(async () => {
    const source = avatarSource.value
    const usernameValue = unref(username)
    const githubUrlValue = unref(githubAvatarUrl)

    switch (source) {
      case AvatarSourceEnum.GITHUB:
        avatarUrl.value = githubUrlValue
        break
      case AvatarSourceEnum.GRAVATAR:
        avatarUrl.value = await gravatarUrlGeneric(usernameValue, unref(size), 'gravatar')
        break
      case AvatarSourceEnum.NONE:
        avatarUrl.value = undefined
        break
      default:
        avatarUrl.value = undefined
    }
  })

  return {
    avatarUrl,
    placeholderIcon,
  }
}
