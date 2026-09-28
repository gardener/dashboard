<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

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
    <span
      v-if="accountName"
      class="d-inline-flex align-center"
    >{{ accountName }}
      <g-copy-btn
        v-if="mailTo && isAccountNameEmail"
        :clipboard-text="accountName"
      />
    </span>
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

import GCopyBtn from '@/components/GCopyBtn.vue'
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
