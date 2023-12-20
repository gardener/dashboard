<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-terminal-splitpanes
    style="background-color: #333;"
  />
</template>

<script>
import GTerminalSplitpanes from '@/components/GTerminalSplitpanes.vue'

import { useTerminalSplitpanes } from '@/composables/useTerminalSplitpanes'

export default {
  components: {
    GTerminalSplitpanes,
  },
  provide () {
    return {
      ...this.terminalSplitpanes,
    }
  },
  setup () {
    const terminalSplitpanes = useTerminalSplitpanes()
    const { load } = terminalSplitpanes

    return {
      load,
      terminalSplitpanes,
    }
  },
  mounted () {
    this.load()
  },
}
</script>
