<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->
<template>
  <g-terminal-splitpanes>
    <template #default="{ item }">
      <g-shoot-details
        style="overflow: auto; height: 100%"
        @add-terminal-shortcut="addTerminalShortcut"
      />

      <g-positional-dropzone
        positional-dropzone
        :uuid="item.uuid"
      />
    </template>
  </g-terminal-splitpanes>
</template>

<script setup>
import { onMounted } from 'vue'

import GShootDetails from '@/components/ShootDetails/GShootDetails'
import GPositionalDropzone from '@/components/GPositionalDropzone'
import GTerminalSplitpanes from '@/components/GTerminalSplitpanes'

import { useProvideTerminalSplitpanes } from '@/composables/useTerminalSplitpanes'

import { PositionEnum } from '@/lib/g-symbol-tree'

const {
  load,
  addSlotItem,
  addShortcut,
} = useProvideTerminalSplitpanes()

function addTerminalShortcut (shortcut) {
  addShortcut({
    position: PositionEnum.BOTTOM,
    shortcut,
  })
}

onMounted(() => {
  load(addSlotItem)
})
</script>
