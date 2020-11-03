<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->
<template>
  <terminal-splitpanes
    ref="terminalSplitpanes"
    :name="shootName"
    :namespace="shootNamespace"
  >
    <template v-slot="{item}">
      <shoot-details
        style="overflow: auto; height: 100%"
        :shootItem="shootItem"
        @addTerminalShortcut="onAddTerminalShortcut"
      ></shoot-details>
      <positional-dropzone positional-dropzone :uuid="item.uuid"></positional-dropzone>
    </template>
  </terminal-splitpanes>
</template>

<script>
import { mapGetters } from 'vuex'
import get from 'lodash/get'

import ShootDetails from '@/components/ShootDetails/ShootDetails'

import PositionalDropzone from '@/components/PositionalDropzone'
import TerminalSplitpanes from '@/components/TerminalSplitpanes'

import { PositionEnum } from '@/lib/g-symbol-tree'

import { shootItem } from '@/mixins/shootItem'

export default {
  name: 'shoot-item',
  components: {
    ShootDetails,
    TerminalSplitpanes,
    PositionalDropzone
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'shootByNamespaceAndName'
    ]),
    value () {
      return this.shootByNamespaceAndName(this.$route.params)
    },
    shootItem () {
      return get(this, 'value', {})
    }
  },
  methods: {
    onAddTerminalShortcut (shortcut) {
      this.$refs.terminalSplitpanes.addShortcut({ position: PositionEnum.BOTTOM, shortcut })
    }
  },
  mounted () {
    const addItemFn = () => this.$refs.terminalSplitpanes.addSlotItem()
    this.$refs.terminalSplitpanes.load(addItemFn)
  }
}
</script>
