<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="wrapper">
    <template v-for="({ type, hint, className }, index) in hints">
      <div v-if="type === 'html'" v-html="hint" :class="className" :key="index" />
      <div v-else v-text="hint" :class="className" :key="`else_${index}`" />
    </template>
  </div>
</template>

<script setup>
import map from 'lodash/map'
import { computed } from 'vue'

const props = defineProps({
  message: {
    type: String,
  },
})

const hints = computed(() => {
  try {
    const obj = JSON.parse(props.message)
    const hints = Array.isArray(obj) ? obj : [obj]

    const severities = ['info', 'success', 'warning', 'error']
    return map(hints, ({ severity, ...rest }) => {
      const className = severities.includes(severity) ? `${severity}--text` : ''
      return { ...rest, className }
    })
  } catch (err) {
    return [
      {
        type: 'text',
        hint: props.message,
      },
    ]
  }
})
</script>
