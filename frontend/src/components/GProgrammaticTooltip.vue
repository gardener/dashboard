<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip
    :model-value="tooltip.visible"
    :location="tooltip.location"
    v-bind="attrs"
    :content-class="{ 'g-transparent-background': tooltip.transparentBackground }"
  >
    <template #activator="{ props: act }">
      <span
        v-bind="act"
        class="g-programmatic-tooltip-anchor"
        :style="anchorStyle"
        aria-hidden="true"
      />
    </template>

    <slot :payload="tooltip.payload" />
  </v-tooltip>
</template>

<script setup>

import {
  computed,
  toRefs,
  useAttrs,
} from 'vue'

const attrs = useAttrs()

const props = defineProps({
  tooltip: {
    type: Object,
    required: true,
  },
})

const { tooltip } = toRefs(props)

const anchorStyle = computed(() => ({
  position: 'fixed',
  left: `${tooltip.value.posX}px`,
  top: `${tooltip.value.posY}px`,
  width: '1px',
  height: '1px',
  pointerEvents: 'none',
}))

</script>

<style scoped>

.g-programmatic-tooltip-anchor {
  display: inline-block;
}

:deep(.v-overlay__content.g-transparent-background) {
  opacity: 1 !important;
  padding: 0;
}

</style>
