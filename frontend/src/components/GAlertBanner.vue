<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-alert
    v-model="alertVisible"
    class="alertBanner"
    :type="type"
    :color="color"
    :rounded="0"
    variant="flat"
    closable
  >
    <slot name="message">
      <!-- eslint-disable vue/no-v-html -->
      <div
        class="alert-banner-message"
        v-html="messageHtml"
      />
      <!-- eslint-enable vue/no-v-html -->
    </slot>
  </v-alert>
</template>

<script setup>
import {
  computed,
  useSlots,
  toRef,
  toRefs,
} from 'vue'

import { useLocalStorageStore } from '@/store/localStorage'

import { transformHtml } from '@/utils'

const slots = useSlots()

// props
const props = defineProps({
  message: { // alternatively, use message slot
    type: String,
  },
  type: {
    type: String,
    default: 'error',
  },
  identifier: { // pass identifier to permanently hide the message on close
    type: String,
  },
  color: {
    type: String,
  },
  transition: {
    type: String,
  },
})

const { type, color } = toRefs(props)
const localStorageStore = useLocalStorageStore()
const hiddenMessages = toRef(localStorageStore, 'hiddenMessages')

// computed
const hasMessage = computed(() => {
  return !!(slots.message || props.message)
})
const permanentlyHidden = computed({
  get () {
    if (props.identifier) {
      return hiddenMessages.value[props.identifier] === true
    }
    return false
  },
  set (value) {
    if (props.identifier) {
      hiddenMessages.value[props.identifier] = value
    }
  },
})
const alertVisible = computed({
  get () {
    return hasMessage.value && !permanentlyHidden.value
  },
  set (value) {
    if (!value) {
      permanentlyHidden.value = true
    }
  },
})
const messageHtml = computed(() => transformHtml(props.message))
</script>
