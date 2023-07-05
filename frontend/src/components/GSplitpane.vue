<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <splitpanes
    :horizontal="splitpaneTree.horizontal"
    @resize="resize"
    @resized="resize"
    @pane-add="resize"
    @pane-remove="resize"
  >
    <pane v-for="item in splitpaneTree.items" :key="item.uuid" min-size="2" class="position-relative">
      <g-splitpane v-if="hasChildren(item)" :splitpane-tree="item">
        <template #default="{item: childItem}">
          <slot :item="childItem"></slot>
        </template>
      </g-splitpane>
      <slot v-else :item="item"></slot>
    </pane>
  </splitpanes>
</template>

<script>
import { defineComponent, nextTick } from 'vue'

import { useAppStore } from '@/store'

import { Splitpanes, Pane } from 'splitpanes'

import 'splitpanes/dist/splitpanes.css'

export default defineComponent({
  setup () {
    const store = useAppStore()

    function resize () {
      // use nextTick as splitpanes library needs to be finished with rendering because fitAddon relies on
      // dynamic dimensions calculated via css, which do not return correct values before rendering is complete
      nextTick(store.updateSplitpaneResize)
    }

    return {
      resize,
    }
  },
  components: {
    Splitpanes,
    Pane,
  },
  props: {
    splitpaneTree: {
      type: Object,
      default: undefined,
    },
  },
  methods: {
    hasChildren (item) {
      const isSplitpaneTree = Reflect.has(item, 'horizontal')
      return isSplitpaneTree
    },
  },
  watch: {
    // workaround for https://github.com/antoniandre/splitpanes/issues/79
    'splitpaneTree.horizontal' (value) {
      this.resize()
    },
  },
})

</script>

<style lang="scss">
  .position-relative {
    position: relative;
  }

  .splitpanes--vertical > .splitpanes__splitter {
    min-width: 2px !important;
    background-color: #000
  }

  .splitpanes--horizontal > .splitpanes__splitter {
    min-height: 2px !important;
    background-color: #000
  }

  .splitpanes__pane {
    transition: none !important;
  }

</style>
