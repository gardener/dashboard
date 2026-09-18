<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="wrapper">
    <template v-for="({ type, hint, className }, index) in hints">
      <div
        v-if="type === 'html'"
        :key="index"
        v-safe-html="hint"
        :class="className"
      />
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
import { computed } from 'vue'

import map from 'lodash/map'

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
      const className = severities.includes(severity) ? `text-${severity}` : ''
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
