<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-menu
    location="left"
    style="max-height: 80%"
    v-model="columnSelectionMenu"
    absolute>
    <template #activator="{ props: menuProps }">
      <v-tooltip location="top">
        <template #activator="{ props: tooltipProps }">
          <v-btn v-bind="{ ...menuProps, ...tooltipProps }" icon>
            <v-icon color="toolbar-title">mdi-dots-vertical</v-icon>
          </v-btn>
        </template>
        Table Options
      </v-tooltip>
    </template>
    <v-list density="compact">
      <v-list-item>
        <v-list-item-title>
          Column Selection
        </v-list-item-title>
      </v-list-item>
      <v-list-item v-for="header in headers" :key="header.value" @click.stop="onSetSelectedHeader(header)">
        <template #prepend>
          <v-list-item-action>
            <v-checkbox-btn :model-value="header.selected" :color="checkboxColor(header.selected)" />
          </v-list-item-action>
        </template>
        <v-list-item-subtitle>
          <v-tooltip v-if="header.customField" location="top">
            <template #activator="{ props }">
              <div v-bind="props">
                <v-badge
                  inline
                  icon="mdi-playlist-star"
                  color="primary"
                  class="mt-0"
                >
                  <span>{{ header.title }}</span>
                </v-badge>
              </div>
            </template>
            Custom Field
          </v-tooltip>
          <template v-else>{{ header.title }}</template>
        </v-list-item-subtitle>
      </v-list-item>
      <v-list-item>
        <v-tooltip location="top" style="width: 100%">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              block
              variant="text"
              class="text-primary"
              @click.stop="onReset"
            >
              Reset
            </v-btn>
          </template>
          <span>Reset to Defaults</span>
        </v-tooltip>
      </v-list-item>
    </v-list>
    <v-list density="compact" v-if="filters && filters.length">
      <v-list-item>
        <v-list-item-title>
          Filter Table
        </v-list-item-title>
      </v-list-item>
      <v-tooltip location="top" :disabled="!filterTooltip">
        <template #activator="{ props }">
          <div v-bind="props">
            <v-list-item
              v-for="filter in filters"
              :key="filter.value"
              :disabled="filter.disabled"
              :class="{ 'disabled_filter': filter.disabled }"
              @click.stop="onToggleFilter(filter)">
              <template #prepend>
                <v-list-item-action>
                  <v-checkbox-btn :model-value="filter.selected" :color="checkboxColor(filter.selected)" />
                </v-list-item-action>
             </template>
              <v-list-item-subtitle>
                {{ filter.text }}
                <v-tooltip location="top" v-if="filter.helpTooltip">
                  <template #activator="{ props }">
                    <v-icon v-bind="props" size="small">mdi-help-circle-outline</v-icon>
                  </template>
                  <div :key="line" v-for="line in filter.helpTooltip">{{ line }}</div>
                </v-tooltip>
              </v-list-item-subtitle>
            </v-list-item>
          </div>
        </template>
        <span>{{ filterTooltip }}</span>
      </v-tooltip>
    </v-list>
  </v-menu>
</template>

<script setup>
import { ref, toRefs } from 'vue'

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

<style lang="scss" scoped >
.disabled_filter {
  opacity: 0.5;
}
</style>
