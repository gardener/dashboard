<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="wrapper">
    <template v-for="({ type, hint, className }, index) in hints" :key="index">
      <div v-if="type === 'html'" v-html="hint" :class="className" />
      <div v-else v-text="hint" :class="className" />
    </template>
  </div>
</template>

<script>
import map from 'lodash/map'

export default {
  props: {
    message: {
      type: String
    }
  },
  computed: {
    hints () {
      try {
        const obj = JSON.parse(this.message)
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
            hint: this.message
          }
        ]
      }
    }
  }
}
</script>
