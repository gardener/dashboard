<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <splitpanes :horizontal="splitpaneTreeItem.horizontal" @resize="resize" @resized="resize" @pane-add="resize" @pane-remove="resize">
    <pane v-for="item in splitpaneTreeItem.items" :key="item.uuid" min-size="2">
      <g-splitpane v-if="item.splitpane" :splitpaneTreeItem="item">
        <template v-slot="{item: childItem}">
          <slot :item="childItem"></slot>
        </template>
      </g-splitpane>
      <slot v-else :item="item"></slot>
    </pane>
  </splitpanes>
</template>

<script>

import { mapActions } from 'vuex'
import { Splitpanes, Pane } from 'splitpanes'
import GSplitpane from '@/components/GSplitpane'

export default {
  name: 'GSplitpane',
  components: {
    Splitpanes,
    Pane,
    GSplitpane
  },
  data () {
    return {
      items: undefined
    }
  },
  props: {
    splitpaneTreeItem: {
      type: Object,
      default: undefined
    }
  },
  methods: {
    ...mapActions([
      'setSplitpaneResize'
    ]),
    resize () {
      // use $nextTick as splitpanes library needs to be finished with rendering because fitAddon relies on
      // dynamic dimensions calculated via css, which do not return correct values before rendering is complete
      this.$nextTick(() => this.setSplitpaneResize(new Date()))
    }
  }
}

</script>

<style lang="styl">
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
