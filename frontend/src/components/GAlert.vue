<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-alert
    class="alertBanner"
    :type="type"
    v-model="alertVisible"
    :color="color"
    closable
  >
    <div v-if="message" class="alert-banner-message" v-html="messageHtml"></div>
    <slot v-else name="message"></slot>
  </v-alert>
</template>

<script setup>
import { inject, computed, useSlots, toRefs } from 'vue'
import { transformHtml } from '@/utils'
import { useLocalStorage } from '@vueuse/core'

const slots = useSlots()
const hiddenMessages = useLocalStorage('global/alert-banner/hidden-messages', {})

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

const notify = inject('notify')
const { message, type, color } = toRefs(props)

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
      notify({
        text: 'test',
      })
      permanentlyHidden.value = true
    }
  },
})
const messageHtml = computed(() => transformHtml(props.message))
</script>
