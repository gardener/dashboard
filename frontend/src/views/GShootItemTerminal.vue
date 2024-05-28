<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-terminal-splitpanes
    style="background-color: #333;"
  />
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
