<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
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
    <v-tooltip location="top">
      <template v-slot:activator="{ props }">
        <v-btn
          v-bind="props"
          :icon="icon"
          :color="btnColor"
          variant="text"
          size="small"
          @click="copyText"
        >
        </v-btn>
      </template>
      {{tooltipText}}
    </v-tooltip>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

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
