<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
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
import get from 'lodash/get'
import { mapGetters } from 'vuex'
import ShootDetails from '@/components/ShootDetails/ShootDetails'
import TerminalSplitpanes from '@/components/TerminalSplitpanes'
import PositionalDropzone from '@/components/PositionalDropzone'
import { PositionEnum } from '@/lib/g-symbol-tree'
import { shootItem } from '@/mixins/shootItem'

export default {
  name: 'shoot-details',
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
