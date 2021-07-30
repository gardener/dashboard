<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="wrapper">
    <template v-for="({ type, hint, className }, index) in hints">
      <div v-if="type === 'html'" v-html="hint" :class="className" :key="index" />
      <div v-else v-text="hint" :class="className" :key="index" />
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

        return map(hints, ({ type, hint, severity }) => {
          return {
            type,
            hint,
            className: severity ? `${severity}--text` : undefined
          }
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
