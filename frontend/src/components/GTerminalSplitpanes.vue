<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div
    class="g-droppable-listener"
    style="height:100%; width:100%;"
    @dropped="droppedAt"
    @keydown="keyMonitor"
  >
    <g-splitpane
      v-if="splitpanesState.splitpaneTree"
      ref="splitpane"
      :splitpane-tree="splitpanesState.splitpaneTree"
    >
      <template #default="{item}">
        <slot
          v-if="item.data.type === 'SLOT_ITEM'"
          :item="item"
        />
        <g-terminal
          v-else
          :uuid="item.uuid"
          :data="item.data"
          @terminated="onTermination(item)"
          @split="orientation => onSplit(item, orientation)"
        />
      </template>
    </g-splitpane>
    <g-create-terminal-session-dialog
      :name="terminalCoordinates.name"
      :namespace="terminalCoordinates.namespace"
    />
  </div>
</template>

<script>
import GSplitpane from '@/components/GSplitpane.vue'
import GTerminal from '@/components/GTerminal.vue'
import GCreateTerminalSessionDialog from '@/components/dialogs/GCreateTerminalSessionDialog.vue'

import { PositionEnum } from '@/lib/g-symbol-tree'

export default {
  components: {
    GSplitpane,
    GTerminal,
    GCreateTerminalSessionDialog,
  },
  inject: [
    'api',
    'terminalCoordinates',
    'splitpanesState',
    'moveTo',
    'add',
    'removeWithId',
    'leavePage',
  ],
  methods: {
    droppedAt ({ detail: { mouseOverId: position, sourceElementDropzoneId: sourceId, mouseOverDropzoneId: targetId } }) {
      this.moveTo({ sourceId, targetId, position })
    },
    keyMonitor (event) {
      if (!(event.ctrlKey && event.shiftKey)) {
        return
      }

      switch (event.key) {
        case 'V':
          this.addFromShortkey({ srcKey: PositionEnum.RIGHT })
          break
        case 'H':
          this.addFromShortkey({ srcKey: PositionEnum.BOTTOM })
          break
      }
    },
    addFromShortkey ({ srcKey: position = PositionEnum.RIGHT } = {}) {
      return this.add({ position })
    },
    onTermination ({ uuid }) {
      this.removeWithId(uuid)
      if (this.splitpanesState.tree.isEmpty()) {
        this.leavePage()
      }
    },
    onSplit ({ uuid: targetId }, orientation = 'horizontal') {
      switch (orientation) {
        case 'horizontal':
          this.add({ position: PositionEnum.RIGHT, targetId })
          break
        case 'vertical':
          this.add({ position: PositionEnum.BOTTOM, targetId })
          break
      } // ignore unknown orientations
    },
  },
}
</script>
