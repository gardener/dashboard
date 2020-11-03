<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <pre class="ansi-text" v-html="escapedAnsiHTML"></pre>
</template>

<script>
import ansiHTML from 'ansi-html'
import escape from 'lodash/escape'

export default {
  props: {
    text: {
      type: String,
      default: ''
    }
  },
  computed: {
    escapedAnsiHTML () {
      return ansiHTML(escape(this.text))
    }
  }
}
</script>

<style lang="scss" scoped>

.ansi-text {
  text-align: left;
  min-width: 250px;
  white-space: pre-wrap;
  max-height: inherit;
}

</style>
