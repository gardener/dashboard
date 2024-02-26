<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-hover v-slot="{ isHovering, props: hoverProps }">
    <div
      v-if="items.length || !hideEmpty"
      class="d-flex align-center"
      v-bind="hoverProps"
    >
      <template v-if="collapse && !expanded">
        <slot
          name="collapsed"
          :item-count="itemCount"
        >
          {{ itemCount }}
          {{ itemCount === 1 ? itemName : (itemPlural ? itemPlural : `${itemName}s`) }}
        </slot>
        <g-collapsable-items-button
          v-visible="isHovering"
          :expanded="expanded"
          @click="toggleExpanded"
        />
      </template>
      <template v-else>
        <template v-if="!items.length">
          <slot name="noItems" />
          <g-collapsable-items-button
            v-visible="isHovering"
            :expanded="expanded"
            @click="toggleExpanded"
          />
        </template>
        <div
          v-else
          class="d-flex"
          :class="noWrap ? 'fley-nowrap' : 'flex-wrap'"
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
            <g-collapsable-items-button
              v-if="collapse && i === items.length - 1"
              v-visible="isHovering"
              :expanded="expanded"
              @click="toggleExpanded"
            />
          </div>
        </div>
      </template>
    </div>
  </v-hover>
</template>

<script setup>

import {
  toRefs,
  reactive,
  ref,
  computed,
  inject,
} from 'vue'

import GCollapsableItemsButton from './GCollapsableItemsButton.vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  uid: {
    type: String,
    required: false,
  },
  collapse: {
    type: Boolean,
    default: false,
  },
  injectKey: {
    type: String,
    required: false,
  },
  hideEmpty: {
    type: Boolean,
    default: false,
  },
  itemName: {
    type: String,
    default: 'Item',
  },
  itemPlural: {
    type: String,
    required: false,
  },
  noWrap: {
    type: Boolean,
    default: false,
  },
})

const { items, itemName, itemPlural, noWrap } = toRefs(props)
const internalExpanded = ref(false)
const expandedItems = props.injectKey ? inject(props.injectKey, reactive({ default: false })) : undefined

const itemCount = computed(() => {
  return props.items.length
})

const expanded = computed({
  get () {
    if (expandedItems) {
      return expandedItems[props.uid] ?? expandedItems.default
    }
    return internalExpanded.value
  },
  set (value) {
    if (expandedItems) {
      expandedItems[props.uid] = value
    } else {
      internalExpanded.value = value
    }
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
