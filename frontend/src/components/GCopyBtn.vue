<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="copy-button d-flex align-center justify-center">
    <g-action-button
      :icon="icon"
      :color="btnColor"
      size="small"
      :tooltip="tooltipText"
      @click="copyText"
    />
    <v-snackbar
      v-if="userFeedback"
      v-model="snackbar"
      location="bottom"
      :success="true"
      :absolute="true"
      :timeout="2000"
      :color="snackbarColor"
    >
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'

const logger = inject('logger')

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
  'copyFailed',
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
    logger.error('error', err)
    snackbar.value = true
    copySucceeded.value = false
    emit('copyFailed')
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
