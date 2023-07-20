<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="wrapper">
    <template v-for="({ type, hint, className }, index) in hints">
      <!-- eslint-disable vue/no-v-html -->
      <div
        v-if="type === 'html'"
        :key="index"
        :class="className"
        v-html="hint"
      />
      <!-- eslint-enable vue/no-v-html -->
      <div
        v-else
        :key="`else_${index}`"
        :class="className"
        v-text="hint"
      />
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
