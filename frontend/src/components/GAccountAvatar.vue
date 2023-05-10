<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-nowrap align-center">
    <v-avatar :size="size" class="mr-2">
      <v-img :src="avatarUrl" :alt="`avatar of ${accountName}`" />
    </v-avatar>
    <a v-if="mailTo && isEmail" :href="`mailto:${accountName}`">{{ accountName }}</a>
    <span v-else-if="accountName">{{ accountName }}</span>
    <span v-else class="font-weight-light text-disabled">Unknown</span>
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
