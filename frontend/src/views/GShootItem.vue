<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->
<template>
  <!--
  <terminal-splitpanes
    ref="terminalSplitpanes"
    :name="shootName"
    :namespace="shootNamespace"
  >
    <template v-slot="{ item }">
  -->
      <g-shoot-details
        style="overflow: auto; height: 100%"
        :shoot-item="shootItem"
        @add-terminal-shortcut="onAddTerminalShortcut"
      ></g-shoot-details>
  <!--
      <g-positional-dropzone positional-dropzone :uuid="item.uuid"></g-positional-dropzone>
    </template>
  </terminal-splitpanes>
  -->
</template>

<script>
import { mapActions } from 'pinia'
import get from 'lodash/get'

import GShootDetails from '@/components/ShootDetails/GShootDetails'

// import GPositionalDropzone from '@/components/GPositionalDropzone'
// import TerminalSplitpanes from '@/components/TerminalSplitpanes'

import { PositionEnum } from '@/lib/g-symbol-tree'

import { useShootStore } from '@/store'

export default {
  name: 'shoot-item',
  components: {
    GShootDetails,
    // TerminalSplitpanes,
    // GPositionalDropzone,
  },
  computed: {
    shootName () {
      return get(this.$route.params, 'name')
    },
    shootNamespace () {
      return get(this.$route.params, 'namespace')
    },
    shootItem () {
      return this.shootByNamespaceAndName(this.$route.params) || {}
    },
  },
  methods: {
    onAddTerminalShortcut (shortcut) {
      this.$refs.terminalSplitpanes.addShortcut({ position: PositionEnum.BOTTOM, shortcut })
    },
    ...mapActions(useShootStore, [
      'shootByNamespaceAndName',
    ]),
  },
  mounted () {
    const addItemFn = () => this.$refs.terminalSplitpanes.addSlotItem()
    // this.$refs.terminalSplitpanes.load(addItemFn)
  },
}
</script>
