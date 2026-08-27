<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-terminal-splitpanes class="terminal-page" />
</template>

<script setup>
import { onMounted } from 'vue'

import GTerminalSplitpanes from '@/components/GTerminalSplitpanes.vue'

import { useProvideTerminalSplitpanes } from '@/composables/useTerminalSplitpanes'

const {
  load,
} = useProvideTerminalSplitpanes()

onMounted(() => {
  load()
})
</script>

<style scoped>
.terminal-page {
  height: 100%;
  background-color: rgb(var(--v-theme-surface));
  padding: 4px;
}
</style>
