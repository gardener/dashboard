<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <svg
    v-show="isDraggingOtherId"
    id="dropzone"
    class="g-droppable-zone positional-dropzone fill-height full-width"
    :data-g-id="uuid"
    preserveAspectRatio="none"
    width="400px"
    height="400px"
    viewBox="0 0 400 400"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    @drag-over="dragOver"
    @drag-leave="dragLeaveZone"
  >
    <g
      id="Page-1"
      stroke="none"
      stroke-width="1"
      fill="none"
      fill-rule="evenodd"
    >
      <rect
        id="Bottom-Rect"
        vector-effect="non-scaling-stroke"
        :stroke="strokeRectBottom"
        stroke-width="2"
        fill-opacity="0.76"
        :fill="fillBottom"
        x="0"
        y="200"
        width="400"
        height="200"
      />
      <rect
        id="Right-Rect"
        vector-effect="non-scaling-stroke"
        :stroke="strokeRectRight"
        stroke-width="2"
        fill-opacity="0.76"
        :fill="fillRight"
        x="200"
        y="0"
        width="200"
        height="400"
      />
      <rect
        id="Left-Rect"
        vector-effect="non-scaling-stroke"
        :stroke="strokeRectLeft"
        stroke-width="2"
        fill-opacity="0.76"
        :fill="fillLeft"
        x="0"
        y="0"
        width="200"
        height="400"
      />
      <rect
        id="Top-Rect"
        vector-effect="non-scaling-stroke"
        :stroke="strokeRectTop"
        stroke-width="2"
        fill-opacity="0.76"
        :fill="fillTop"
        x="0"
        y="0"
        width="400"
        height="200"
      />
      <path
        id="bottom"
        class="g-droppable"
        d="M282.5,117.5 L282.5,517.5 L117.5,352.5 L122.5,352.5 L122.499,277.501 L282.5,117.5 Z"
        :data-g-id="uuid"
        fill-opacity="0"
        fill="#D8D8D8"
        transform="translate(200.000000, 317.500000) rotate(90.000000) translate(-200.000000, -317.500000) "
        @dropped="dropped"
        @drag-over="dragOver"
      />
      <path
        id="right"
        class="g-droppable"
        d="M400,0 L400,400 L240,240 L240,165 L235.001,164.999 L400,0 Z"
        :data-g-id="uuid"
        fill-opacity="0"
        fill="#D8D8D8"
        @dropped="dropped"
        @drag-over="dragOver"
      />
      <path
        id="left"
        class="g-droppable"
        d="M165,2.55795385e-13 L165,400 L2.84217094e-14,234.999 L2.84217094e-14,165.001 L165,2.55795385e-13 Z"
        :data-g-id="uuid"
        fill-opacity="0"
        fill="#D8D8D8"
        transform="translate(82.500000, 200.000000) rotate(-180.000000) translate(-82.500000, -200.000000) "
        @dropped="dropped"
        @drag-over="dragOver"
      />
      <path
        id="top"
        class="g-droppable"
        d="M282.5,-117.5 L282.5,282.5 L117.5,117.5 L117.5,47.5 L282.5,-117.5 Z"
        :data-g-id="uuid"
        fill-opacity="0"
        fill="#D8D8D8"
        transform="translate(200.000000, 82.500000) rotate(-90.000000) translate(-200.000000, -82.500000) "
        @dropped="dropped"
        @drag-over="dragOver"
      />
    </g>
  </svg>
</template>

<script>
import { mapState } from 'pinia'

import { useTerminalStore } from '@/store/terminal'

import { PositionEnum } from '@/lib/g-symbol-tree'

export default {
  props: {
    uuid: {
      type: String,
    },
  },
  emits: ['droppedAt'],
  data () {
    return {
      currentPosition: undefined,
      mouseDown: false,
      rect: {
        top: undefined,
        left: undefined,
        right: undefined,
        bottom: undefined,
      },
      strokeRect: {
        top: undefined,
        left: undefined,
        right: undefined,
        bottom: undefined,
      },
    }
  },
  computed: {
    ...mapState(useTerminalStore, [
      'draggingDragAndDropId',
    ]),
    isDraggingOtherId () {
      return this.draggingDragAndDropId && this.draggingDragAndDropId !== this.uuid
    },
    fillTop () {
      return this.fillOnPosition(PositionEnum.TOP)
    },
    fillLeft () {
      return this.fillOnPosition(PositionEnum.LEFT)
    },
    fillRight () {
      return this.fillOnPosition(PositionEnum.RIGHT)
    },
    fillBottom () {
      return this.fillOnPosition(PositionEnum.BOTTOM)
    },
    strokeRectTop () {
      return this.strokeRectOnPosition(PositionEnum.TOP)
    },
    strokeRectLeft () {
      return this.strokeRectOnPosition(PositionEnum.LEFT)
    },
    strokeRectRight () {
      return this.strokeRectOnPosition(PositionEnum.RIGHT)
    },
    strokeRectBottom () {
      return this.strokeRectOnPosition(PositionEnum.BOTTOM)
    },
  },
  methods: {
    fillOnPosition (position) {
      const { [position]: value } = this.rect
      return this.mouseDown ? value : undefined
    },
    strokeRectOnPosition (position) {
      const { [position]: value } = this.strokeRect
      return this.mouseDown ? value : undefined
    },
    dragOver ({ detail: { mouseOverId: position } }) {
      this.showIt = true
      if (position === 'dropzone') {
        return
      }
      this.mouseDown = true
      this.rect = { [position]: '#d71e00' }

      this.strokeRect = { [position]: '#fff' }
      this.currentPosition = position
    },
    dragLeaveZone () {
      this.showIt = false
      this.rect = {}
      this.strokeRect = {}
      this.currentPosition = undefined
    },
    dropped () {
      this.mouseDown = false

      this.$emit('droppedAt', this.currentPosition)
    },
  },
}
</script>

<style lang="scss" scoped>
  .positional-dropzone {
    position: absolute;
    left: 0;
    top: 0;
  }
</style>
