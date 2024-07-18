<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-if="items.length"
    class="d-flex"
    :class="!expanded ? 'collapsible-items-wrapper' : ''"
  >
    <div
      class="d-flex align-center"
    >
      <template v-if="!expanded">
        <v-chip
          variant="outlined"
          size="small"
          :color="chipColor"
          label
          @click="toggleExpanded"
        >
          {{ itemCount }}
          <v-tooltip
            top
            activator="parent"
          >
            Expand items
          </v-tooltip>
        </v-chip>
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
              :on-click="toggleExpanded"
            />
          </div>
        </div>
      </template>
    </div>
    <div>
      <g-collapsible-items-button
        class="collapsible-items-button"
        :expanded="expanded"
        @click="toggleExpanded"
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

import GCollapsibleItemsButton from './GCollapsibleItemsButton.vue'

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

const toggleExpanded = e => {
  const newValue = !expanded.value

  if (e.shiftKey) {
    if (expandedItems) {
      for (const key in expandedItems) {
        delete expandedItems[key]
      }
      expandedItems.default = newValue
    }
  } else {
    expanded.value = newValue
  }
}

</script>

<style lang="scss" scoped>
  .collapsible-items-wrapper {
    .collapsible-items-button {
      visibility: hidden;
    }
  }

  .collapsible-items-wrapper:hover{
    .collapsible-items-button {
      visibility: visible;
    }
  }
</style>
