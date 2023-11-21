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
      <v-tooltip location="top">
        <template #activator="{ props: tooltipProps }">
          <v-btn
            v-bind="mergeProps(menuProps, tooltipProps)"
            icon="mdi-dots-vertical"
          />
        </template>
        Table Options
      </v-tooltip>
    </template>
    <v-card>
      <v-card-text class="pt-1">
        <div class="d-flex align-center justify-space-between">
          <span class="text-subtitle-2 text-medium-emphasis py-2">
            Column Selection
          </span>
          <v-tooltip
            activator="parent"
            location="top"
          >
            <template #activator="{ props: activatorProps }">
              <v-btn
                v-bind="activatorProps"
                icon="mdi-restore"
                size="small"
                variant="text"
                flat
                @click.stop="onReset"
              />
            </template>
            Reset to Defaults
          </v-tooltip>
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
            <v-tooltip
              v-if="header.customField"
              location="top"
            >
              <template #activator="{ props: activatorProps }">
                <span
                  v-bind="activatorProps"
                  class="text-caption"
                >
                  {{ header.title }}
                  <v-icon
                    color="primary"
                    icon="mdi-playlist-star"
                    end
                  />
                </span>
              </template>
              Custom Field
            </v-tooltip>
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
        <v-card-text class="pt-1">
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
          <v-tooltip
            activator="parent"
            location="bottom"
            :disabled="!filterTooltip"
            max-width="300"
          >
            {{ filterTooltip }}
          </v-tooltip>
        </v-card-text>
      </template>
    </v-card>
  </v-menu>
</template>

<script setup>
import {
  ref,
  toRefs,
  mergeProps,
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
