<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-terminal-splitpanes
    ref="terminalSplitpanes"
    :name="name"
    :namespace="namespace"
    :target="target"
    style="background-color: #333;"
  />
</template>

<script>
import get from 'lodash/get'
import GTerminalSplitpanes from '@/components/GTerminalSplitpanes.vue'

export default {
  components: {
    GTerminalSplitpanes,
  },
  computed: {
    name () {
      return get(this.$route.params, 'name')
    },
    namespace () {
      return get(this.$route.params, 'namespace')
    },
    target () {
      return get(this.$route.params, 'target')
    },
  },
  mounted () {
    this.$refs.terminalSplitpanes.load()
  },
}
</script>
