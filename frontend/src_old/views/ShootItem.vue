<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

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
        :shoot-item="shootItem"
        @add-terminal-shortcut="onAddTerminalShortcut"
      ></shoot-details>
      <positional-dropzone positional-dropzone :uuid="item.uuid"></positional-dropzone>
    </template>
  </terminal-splitpanes>
</template>

<script>
import { mapGetters } from 'vuex'
import get from 'lodash/get'

import ShootDetails from '@/components/ShootDetails/ShootDetails.vue'

import PositionalDropzone from '@/components/PositionalDropzone.vue'
import TerminalSplitpanes from '@/components/TerminalSplitpanes.vue'

import { PositionEnum } from '@/lib/g-symbol-tree'

export default {
  name: 'shoot-item',
  components: {
    ShootDetails,
    TerminalSplitpanes,
    PositionalDropzone
  },
  computed: {
    ...mapGetters([
      'shootByNamespaceAndName'
    ]),
    shootName () {
      return get(this.$route.params, 'name')
    },
    shootNamespace () {
      return get(this.$route.params, 'namespace')
    },
    shootItem () {
      return this.shootByNamespaceAndName(this.$route.params) || {}
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
