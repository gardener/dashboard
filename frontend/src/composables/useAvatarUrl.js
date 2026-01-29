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

import {
  gravatarUrlGeneric,
  isServiceAccountUsername,
} from '@/utils'

import get from 'lodash/get'

export function useAvatarUrl (username, size = 128, avatarSource = null) {
  const configStore = useConfigStore()
  const avatarUrl = ref(undefined)

  const effectiveAvatarSource = computed(() => {
    return avatarSource ?? get(configStore, ['avatarSource'], 'gravatar')
  })

  const placeholderIcon = computed(() => isServiceAccountUsername(username.value) ? 'mdi-robot-happy' : 'mdi-account-circle')

  watchEffect(async () => {
    avatarUrl.value = await gravatarUrlGeneric(
      username.value,
      unref(size),
      effectiveAvatarSource.value,
    )
  })

  return {
    avatarUrl,
    placeholderIcon,
  }
}
