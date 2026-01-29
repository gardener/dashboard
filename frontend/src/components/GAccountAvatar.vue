<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-nowrap align-center">
    <g-avatar
      :account-name="accountName"
      :size="size"
      :alt="`avatar of ${accountName}`"
      class="mr-1"
    />
    <a
      v-if="mailTo && isAccountNameEmail"
      :href="`mailto:${accountName}`"
      class="text-anchor"
    >{{ accountName }}</a>
    <span v-else-if="accountName">{{ accountName }}</span>
    <span
      v-else
      class="font-weight-light text-disabled"
    >Unknown</span>
  </div>
</template>

<script setup>
import {
  computed,
  toRefs,
} from 'vue'

import GAvatar from '@/components/GAvatar.vue'

import { isEmail } from '@/utils'

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

const { accountName } = toRefs(props)

const isAccountNameEmail = computed(() => {
  return isEmail(accountName.value)
})
</script>
