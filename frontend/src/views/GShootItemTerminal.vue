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
import { toRef } from 'vue'
import { useRoute } from 'vue-router'

import GTerminalSplitpanes from '@/components/GTerminalSplitpanes.vue'

import { useTerminalSplitpanes } from '@/composables/useTerminalSplitpanes'

import { get } from '@/lodash'

export default {
  components: {
    GTerminalSplitpanes,
  },
  provide () {
    return {
      terminalCoordinates: this.terminalCoordinates,
      defaultTarget: this.defaultTarget,
      splitpanesState: this.state,
      moveTo: this.moveTo,
      add: this.add,
      setSelections: this.setSelections,
      removeWithId: this.removeWithId,
      leavePage: this.leavePage,
    }
  },
  setup () {
    const currentRoute = useRoute()

    const terminalSplitpanes = useTerminalSplitpanes({
      name: toRef(() => get(currentRoute.params, 'name')),
      namespace: toRef(() => get(currentRoute.params, 'namespace')),
      target: toRef(() => get(currentRoute.params, 'target')),
    })

    return {
      ...terminalSplitpanes,
    }
  },
  mounted () {
    this.load()
  },
}
</script>
