<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-menu
    v-model="columnSelectionMenu"
    location="left"
    style="max-height: 80%"
    absolute
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
    <v-list density="compact">
      <v-list-subheader>
        Column Selection
      </v-list-subheader>
      <v-list-item
        v-for="header in headers"
        :key="header.value"
        @click.stop="onSetSelectedHeader(header)"
      >
        <template #prepend>
          <v-list-item-action>
            <v-checkbox-btn
              :model-value="header.selected"
              :color="checkboxColor(header.selected)"
            />
          </v-list-item-action>
        </template>
        <v-list-item-subtitle>
          <v-tooltip
            v-if="header.customField"
            location="top"
          >
            <template #activator="{ props: activatorProps }">
              <div v-bind="activatorProps">
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
          <template v-else>
            {{ header.title }}
          </template>
        </v-list-item-subtitle>
      </v-list-item>
      <v-list-item>
        <v-tooltip
          location="top"
          style="width: 100%"
        >
          <template #activator="{ props: activatorProps }">
            <v-btn
              v-bind="activatorProps"
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
    <v-list
      v-if="filters && filters.length"
      density="compact"
    >
      <v-list-item>
        <v-list-item-title>
          Filter Table
        </v-list-item-title>
      </v-list-item>
      <v-tooltip
        location="top"
        :disabled="!filterTooltip"
      >
        <template #activator="{ props: activatorProps }">
          <div v-bind="activatorProps">
            <v-list-item
              v-for="filter in filters"
              :key="filter.value"
              :disabled="filter.disabled"
              :class="{ 'disabled_filter': filter.disabled }"
              @click.stop="onToggleFilter(filter)"
            >
              <template #prepend>
                <v-list-item-action>
                  <v-checkbox-btn
                    :model-value="filter.selected"
                    :color="checkboxColor(filter.selected)"
                  />
                </v-list-item-action>
              </template>
              <v-list-item-subtitle>
                {{ filter.text }}
                <v-tooltip
                  v-if="filter.helpTooltip"
                  location="top"
                >
                  <template #activator="{ props: innerActivatorProps }">
                    <v-icon
                      v-bind="innerActivatorProps"
                      size="small"
                    >
                      mdi-help-circle-outline
                    </v-icon>
                  </template>
                  <div
                    v-for="line in filter.helpTooltip"
                    :key="line"
                  >
                    {{ line }}
                  </div>
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
import { ref, toRefs, mergeProps } from 'vue'

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

<style lang="scss" scoped>
.disabled_filter {
  opacity: 0.5;
}
</style>
