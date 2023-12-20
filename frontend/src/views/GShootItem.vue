<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->
<template>
  <g-terminal-splitpanes>
    <template #default="{ item }">
      <g-shoot-details
        style="overflow: auto; height: 100%"
        :shoot-item="shootItem"
        @add-terminal-shortcut="onAddTerminalShortcut"
      />

      <g-positional-dropzone
        positional-dropzone
        :uuid="item.uuid"
      />
    </template>
  </g-terminal-splitpanes>
</template>

<script>
import { toRef } from 'vue'
import { useRoute } from 'vue-router'
import { mapActions } from 'pinia'

import { useShootStore } from '@/store/shoot'

import GShootDetails from '@/components/ShootDetails/GShootDetails'
import GPositionalDropzone from '@/components/GPositionalDropzone'
import GTerminalSplitpanes from '@/components/GTerminalSplitpanes'

import { useTerminalSplitpanes } from '@/composables/useTerminalSplitpanes'

import { PositionEnum } from '@/lib/g-symbol-tree'

import { get } from '@/lodash'

export default {
  name: 'ShootItem',
  components: {
    GShootDetails,
    GTerminalSplitpanes,
    GPositionalDropzone,
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
    })

    return {
      ...terminalSplitpanes,
    }
  },
  computed: {
    shootItem () {
      return this.shootByNamespaceAndName(this.$route.params) || {}
    },
  },
  async mounted () {
    const addItemFn = () => this.addSlotItem()
    await this.load(addItemFn)
  },
  methods: {
    ...mapActions(useShootStore, [
      'shootByNamespaceAndName',
    ]),
    onAddTerminalShortcut (shortcut) {
      this.addShortcut({ position: PositionEnum.BOTTOM, shortcut })
    },
  },
}
</script>
