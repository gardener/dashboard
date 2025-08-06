<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-menu
    v-model="columnSelectionMenu"
    location="left"
    offset="5"
    :close-on-content-click="false"
    absolute
    min-width="240"
    style="max-height: 80%"
  >
    <template #activator="{ props: menuProps }">
      <v-btn
        v-tooltip:top="'Table Options'"
        v-bind="menuProps"
        icon="mdi-dots-vertical"
      />
    </template>
    <v-card>
      <v-card-text class="pt-1">
        <div class="d-flex align-center justify-space-between">
          <span class="text-subtitle-2 text-medium-emphasis py-2">
            Column Selection
          </span>
          <v-btn
            v-tooltip:top="'Reset to Defaults'"
            icon="mdi-restore"
            size="small"
            variant="text"
            flat
            @click.stop="onReset"
          />
        </div>
        <v-checkbox-btn
          v-for="header in headers"
          :key="header.value"
          :model-value="header.selected"
          :color="checkboxColor(header.selected)"
          density="compact"
          class="text-body-2"
          @update:model-value="onSetSelectedHeader(header)"
        >
          <template #label>
            <span
              v-if="header.customField"
              v-tooltip:top="'Custom Field'"
              class="text-caption"
            >
              {{ header.title }}
              <v-icon
                color="primary"
                icon="mdi-playlist-star"
                end
              />
            </span>
            <span
              v-else
              class="text-caption"
            >
              {{ header.title }}
            </span>
          </template>
        </v-checkbox-btn>
      </v-card-text>
      <template v-if="filters && filters.length">
        <v-divider />
        <v-card-text
          v-tooltip:bottom="{
            text: filterTooltip,
            disabled: !filterTooltip, maxWidth: 300
          }"
          class="pt-1"
        >
          <div class="text-subtitle-2 text-medium-emphasis py-2">
            Table Filter
          </div>
          <v-checkbox-btn
            v-for="filter in filters"
            :key="filter.value"
            :model-value="filter.selected"
            :color="checkboxColor(filter.selected)"
            :disabled="filter.disabled"
            density="compact"
            class="text-body-2"
            @update:model-value="onToggleFilter(filter)"
          >
            <template #label>
              <span
                class="text-caption"
              >
                {{ filter.text }}
              </span>
            </template>
          </v-checkbox-btn>
        </v-card-text>
      </template>
    </v-card>
  </v-menu>
</template>

<script setup>
import {
  ref,
  toRefs,
} from 'vue'

const columnSelectionMenu = ref(false)

// props
const props = defineProps({
  headers: {
    type: Array,
  },
  filters: {
    type: Array,
  },
  filterTooltip: {
    type: String,
  },
})

const { headers, filters, filterTooltip } = toRefs(props)

// emits
const emit = defineEmits([
  'reset',
  'setSelectedHeader',
  'toggleFilter',
])

function onSetSelectedHeader (header) {
  emit('setSelectedHeader', header)
}

function onReset () {
  emit('reset')
}

function onToggleFilter (filter) {
  emit('toggleFilter', filter)
}

function checkboxColor (selected) {
  return selected ? 'primary' : ''
}
</script>
