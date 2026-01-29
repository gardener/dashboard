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
  computed,
  toRefs,
} from 'vue'

import { useAvatarUrl } from '@/composables/useAvatarUrl'

const props = defineProps({
  accountName: {
    type: String,
    default: '',
  },
  size: {
    type: Number,
    default: 40,
  },
  iconColor: {
    type: String,
    default: 'grey-lighten-1',
  },
  alt: {
    type: String,
    default: '',
  },
})

const { accountName, size } = toRefs(props)

const avatarSize = computed(() => size.value * 2)
const iconSize = computed(() => size.value)

const { avatarUrl, placeholderIcon } = useAvatarUrl(accountName, avatarSize)
</script>
