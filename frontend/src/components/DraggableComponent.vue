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
  <div style="height: 100%">
    <div v-g-draggable="draggableValue" :data-g-id="uuid" @dragStart="dragStart" @dragEnd="dragEnd" style="height: 100%; width: 100%;">
      <div ref="handle" :data-g-id="uuid">
        <slot name="handle"></slot>
      </div>
      <slot name="component"></slot>
    </div>
    <positional-dropzone :uuid="uuid" v-if="!draggableValue.dragging" style="position: absolute; height: 100%; width: 100%; left: 0; top: 0;"></positional-dropzone>
  </div>
</template>

<script>
import { mapActions } from 'vuex'
import { gDraggable } from '@/lib/g-draggable'
import PositionalDropzone from '@/components/PositionalDropzone'

export default {
  name: 'draggable-component',
  directives: {
    gDraggable
  },
  components: {
    PositionalDropzone
  },
  props: {
    uuid: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      draggableValue: {
        handle: undefined,
        dragging: false
      }
    }
  },
  methods: {
    ...mapActions([
      'setDraggingDragAndDropId'
    ]),
    dragStart () {
      this.setDraggingDragAndDropId(this.uuid)
    },
    dragEnd () {
      this.setDraggingDragAndDropId(undefined)
    }
  },
  mounted () {
    this.draggableValue.handle = this.$refs.handle
  }
}

</script>
