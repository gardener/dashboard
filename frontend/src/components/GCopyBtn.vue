<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="copy-button d-flex align-center justify-center">
    <g-action-button
      :icon="icon"
      :color="btnColor"
      :loading="loading"
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
import {
  ref,
  computed,
  inject,
  toValue,
} from 'vue'

const logger = inject('logger')

// props
const props = defineProps({
  clipboardText: {
    type: [String, Function],
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
  loading: {
    type: Boolean,
  },
})

let timeoutId

// reactive state
const snackbar = ref(false)
const copySucceeded = ref(false)

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
    const text = await toValue(props.clipboardText)
    if (text === false || text === undefined) {
      throw Error('Could not fetch text to copy')
    }
    await navigator.clipboard.writeText(text)
    copySucceeded.value = true
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      copySucceeded.value = false
    }, 1000)
    emit('copy')
  } catch (err) {
    logger.error('Copy to clipboard failed: %s', err.message)
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
