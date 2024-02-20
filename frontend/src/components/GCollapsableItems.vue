<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-hover v-slot="{ isHovering, props: hoverProps }">
    <div
      class="d-flex align-center"
      v-bind="hoverProps"
    >
      <template v-if="collapse && !expanded">
        <slot
          name="collapsed"
          :item-count="itemCount"
        >
          {{ itemCount }}
          {{ itemCount !== 1 ? 'Item' : 'Items' }}
        </slot>
        <v-btn
          v-visible="isHovering"
          icon="mdi-chevron-right"
          size="small"
          density="compact"
          variant="flat"
          @click="toggleExpanded"
        />
      </template>
      <template v-else>
        <template v-if="!items.length">
          <slot name="noItems" />
          <v-btn
            v-visible="isHovering"
            icon="mdi-chevron-left"
            size="small"
            density="compact"
            variant="flat"
            @click="toggleExpanded"
          />
        </template>
        <div
          v-else
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
            <v-btn
              v-if="collapse && i === items.length - 1"
              v-visible="isHovering"
              icon="mdi-chevron-left"
              size="small"
              density="compact"
              variant="flat"
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

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  uid: {
    type: String,
    required: true,
  },
  collapse: {
    type: Boolean,
    default: false,
  },
  injectKey: {
    type: String,
    default: '',
  },
})

const { items } = toRefs(props)
const internalExpanded = ref(false)
const expandedItems = inject(props.injectKey, reactive({ default: false }))

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
