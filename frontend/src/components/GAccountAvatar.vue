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
    <g-auto-hide
      v-if="accountName && copyable && isAccountNameEmail"
      right
      class="account-name-copy"
    >
      <template #activator>
        <span>{{ accountName }}</span>
      </template>
      <g-copy-btn
        :clipboard-text="accountName"
        density="compact"
        :icon-size-px="16"
        tooltip-text="Copy email address to clipboard"
      />
    </g-auto-hide>
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

import GCopyBtn from '@/components/GCopyBtn.vue'
import GAvatar from '@/components/GAvatar.vue'
import GAutoHide from '@/components/GAutoHide.vue'

import { isEmail } from '@/utils'

const props = defineProps({
  accountName: {
    type: String,
    default: '',
  },
  copyable: {
    type: Boolean,
    default: true,
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

<style lang="scss" scoped>
.account-name-copy :deep(.copy-button) {
  height: 0;
}
</style>
