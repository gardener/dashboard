<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-avatar
    :size="size"
  >
    <v-img
      v-if="avatarUrl"
      :src="avatarUrl"
      :alt="alt"
    />
    <v-icon
      v-else
      :size="iconSize"
      :icon="placeholderIcon"
      :color="iconColor"
    />
  </v-avatar>
</template>

<script setup>
import {
  toRefs,
  ref,
} from 'vue'

import { useTicketAvatar } from '@/composables/useTicketAvatar'

const props = defineProps({
  login: {
    type: String,
    required: true,
  },
  iconColor: {
    type: String,
    default: 'primary',
  },
  alt: {
    type: String,
    default: '',
  },
  githubAvatarUrl: {
    type: String,
    default: undefined,
  },
})

const { login, githubAvatarUrl, size } = toRefs(props)

const avatarSize = ref(80)
const iconSize = ref(32)

const { avatarUrl, placeholderIcon } = useTicketAvatar(login, githubAvatarUrl, avatarSize)
</script>
