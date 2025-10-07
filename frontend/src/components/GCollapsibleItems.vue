<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-if="items.length"
    class="d-flex"
  >
    <div
      class="d-flex align-center"
    >
      <template v-if="!expanded">
        <v-hover v-slot="{ props: hoverProps, isHovering }">
          <v-chip
            v-tooltip:top="'Expand items'"
            v-bind="hoverProps"
            :variant="isHovering ? 'flat' : 'outlined'"
            size="small"
            :color="chipColor"
            label
            class="pointer"
            @click="expanded = true"
          >
            {{ itemCount }}
          </v-chip>
        </v-hover>
      </template>
      <template v-else>
        <div
          class="d-flex flex-wrap"
        >
          <div
            v-for="(item, i) in items"
            :key="i"
            class="d-flex align-center"
          >
            <slot
              name="item"
              :item="item"
            />
          </div>
        </div>
      </template>
    </div>
    <div>
      <v-btn
        v-if="expanded"
        icon="mdi-close"
        variant="plain"
        size="small"
        @click="expanded = false"
      />
    </div>
  </div>
</template>

<script setup>

import {
  toRefs,
  computed,
  inject,
} from 'vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  uid: {
    type: String,
    required: false,
  },
  injectKey: {
    type: String,
    required: false,
  },
  chipColor: {
    type: String,
    default: 'primary',
  },
})

const { items } = toRefs(props)
const expandedItems = inject(props.injectKey, undefined)

const itemCount = computed(() => {
  return props.items.length
})

const expanded = computed({
  get () {
    return expandedItems[props.uid] ?? expandedItems.default
  },
  set (value) {
    expandedItems[props.uid] = value
  },
})

</script>
