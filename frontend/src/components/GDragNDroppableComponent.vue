<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div class="fill-height">
    <div
      class="fill-height full-width"
      v-g-draggable="draggableValue"
      :data-g-id="uuid"
      :draggable="true"
      @drag-start="dragStart"
      @drag-end="dragEnd"
    >
      <div ref="handle" :data-g-id="uuid">
        <slot name="handle"/>
      </div>
      <slot name="component"/>
    </div>
    <g-positional-dropzone v-if="!draggableValue.dragging"
      :uuid="uuid"
    />
  </div>
</template>

<script>
import { mapActions } from 'pinia'

import { useTerminalStore } from '@/store'

import { gDraggable } from '@/lib/g-draggable'
import GPositionalDropzone from '@/components/GPositionalDropzone.vue'

export default {
  name: 'draggable-component',
  directives: {
    gDraggable,
  },
  components: {
    GPositionalDropzone,
  },
  props: {
    uuid: {
      type: String,
      required: true,
    },
  },
  data () {
    return {
      draggableValue: {
        handle: undefined,
        dragging: false,
      },
    }
  },
  methods: {
    ...mapActions(useTerminalStore, [
      'setDraggingDragAndDropId',
    ]),
    dragStart () {
      this.setDraggingDragAndDropId(this.uuid)
    },
    dragEnd () {
      this.setDraggingDragAndDropId(undefined)
    },
  },
  mounted () {
    this.draggableValue.handle = this.$refs.handle
  },
}

</script>
