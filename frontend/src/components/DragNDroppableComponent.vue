<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div class="fill-height">
    <div v-g-draggable="draggableValue" :data-g-id="uuid" @dragStart="dragStart" @dragEnd="dragEnd" class="fill-height full-width">
      <div ref="handle" :data-g-id="uuid">
        <slot name="handle"></slot>
      </div>
      <slot name="component"></slot>
    </div>
    <positional-dropzone :uuid="uuid" v-if="!draggableValue.dragging"></positional-dropzone>
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
