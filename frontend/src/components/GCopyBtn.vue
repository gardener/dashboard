<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-snackbar
    v-if="userFeedback"
    v-model="snackbar"
    location="bottom"
    :success="true"
    :absolute="true"
    :timeout="2000"
    :color="snackbarColor"
  >
    {{snackbarText}}
  </v-snackbar>
  <g-action-button
    class="copy-button"
    :icon="icon"
    :color="btnColor"
    :tooltip="tooltipText"
    @click="copyText"
  />
</template>

<script setup>
import { ref, computed } from 'vue'

import GActionButton from '@/components/GActionButton.vue'

// props
const props = defineProps({
  clipboardText: {
    type: String,
    default: '',
  },
  copyFailedText: {
    type: String,
    default: 'Copy to clipboard failed',
  },
  tooltipText: {
    type: String,
    default: 'Copy to clipboard',
  },
  color: {
    type: String,
  },
  userFeedback: {
    type: Boolean,
    default: true,
  },
})

// reactive state
const snackbar = ref(false)
const copySucceeded = ref(false)
const timeoutId = ref()

// computed
const snackbarText = computed(() => props.copyFailedText)
const snackbarColor = computed(() => 'error')
const icon = computed(() => {
  return copySucceeded.value
    ? 'mdi-check'
    : 'mdi-content-copy'
})
const btnColor = computed(() => {
  if (copySucceeded.value) {
    return 'success'
  }
  if (props.color) {
    return props.color
  }
  return 'action-button'
})

// events
const emit = defineEmits([
  'copy',
  'copy-failed',
])

// methods
const copyText = async () => {
  try {
    await navigator.clipboard.writeText(props.clipboardText)
    copySucceeded.value = true
    clearTimeout(timeoutId.value)
    timeoutId.value = setTimeout(() => {
      copySucceeded.value = false
    }, 1000)
    emit('copy')
  } catch (err) {
    console.error('error', err)
    snackbar.value = true
    copySucceeded.value = false
    emit('copy-failed')
  }
}
</script>

<style lang="scss" scoped>
.copy-button {
  :deep(.v-icon) {
    font-size: 18px;
  }
}
</style>
