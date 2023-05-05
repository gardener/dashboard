<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="nowrap">
    <v-avatar :size="size">
      <v-img :src="avatarUrl" :alt="`avatar of ${accountName}`" />
    </v-avatar>
    <a v-if="mailTo && isEmail" :href="`mailto:${accountName}`" class="pl-2">{{ accountName }}</a>
    <span v-else-if="accountName" class="pl-2">{{ accountName }}</span>
    <span v-else class="pl-2 font-weight-light text-disabled">Unknown</span>
  </div>
</template>

<script setup>
import { computed, toRefs } from 'vue'

import { gravatarUrlGeneric, isEmail } from '@/utils'

const props = defineProps({
  accountName: {
    type: String,
    default: '',
  },
  mailTo: {
    type: Boolean,
    default: false,
  },
  size: {
    type: Number,
    default: 24,
  },
})

const { accountName, mailTo, size } = toRefs(props)

const avatarUrl = computed(() => {
  return gravatarUrlGeneric(accountName.value, size.value * 2)
})
</script>
