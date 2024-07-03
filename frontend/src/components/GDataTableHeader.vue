<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <tr>
    <template
      v-for="column in columns"
      :key="column.key"
    >
      <th>
        <div
          class="v-data-table-header__content align-center table-header"
          :class="[column.align ? `justify-${column.align}` : '', 'hover-button-container']"
        >
          <span
            class="cursor-pointer"
            @click="() => toggleSort(column)"
          >{{ column.title }}</span>
          <v-tooltip
            v-if="column.sortable"
          >
            <template #activator="{ props: tooltipProps }">
              <v-btn
                v-bind="tooltipProps"
                :icon="getSortIcon(column)"
                size="xx-small"
                class="ml-2"
                :class="{'hover-button' : !isSorted(column)}"
                color="primary"
                :variant="isSorted(column) ? 'tonal' : 'text'"
                @click="() => toggleSort(column)"
              />
            </template>
            Sort by <code>{{ column.title }}</code>
            {{ isSortedAscending(column) ? 'descending' : 'ascending' }}
          </v-tooltip>
          <v-tooltip
            v-if="!!column.expandedItems"
          >
            <template #activator="{ props: tooltipProps }">
              <v-btn
                v-bind="tooltipProps"
                :icon="allExpanded(column) ? 'mdi-chevron-double-left' : 'mdi-chevron-double-right'"
                size="xx-small"
                class="ml-2"
                :class="{'hover-button' : !allExpanded(column)}"
                color="primary"
                :variant="allExpanded(column) ? 'tonal' : 'text'"
                @click="() => toggleExpanded(column)"
              />
            </template>
            {{ allExpanded(column) ? 'Collapse' : 'Expand' }}
            all
            {{ column.title }}
          </v-tooltip>
        </div>
      </th>
    </template>
  </tr>
</template>

<script setup>
import {
  toRefs,
  unref,
} from 'vue'

import { head } from '@/lodash'

const props = defineProps({
  columns: {
    type: Array,
    required: true,
  },
  isSorted: {
    type: Function,
    equired: true,
  },
  getSortIcon: {
    type: Function,
    required: true,
  },
  sortBy: {
    type: Object,
    required: false,
  },
  toggleSort: {
    type: Function,
    required: true,
  },
})

const { columns, isSorted, getSortIcon, toggleSort, sortBy } = toRefs(props)

const allExpanded = column => {
  return column.expandedItems.default === true
}

const toggleExpanded = column => {
  const newValue = !column.expandedItems.default
  for (const key in column.expandedItems) {
    delete column.expandedItems[key]
  }
  column.expandedItems.default = newValue
}

const isSortedAscending = column => {
  const sortOrder = head(unref(sortBy))
  return sortOrder?.key === column.key && sortOrder?.order === 'asc'
}

</script>
<style lang="scss" scoped>
  .hover-button-container {
    .hover-button {
      visibility: hidden;
    }
  }

  .hover-button-container:hover {
    .hover-button {
      visibility: visible;
    }
  }
</style>
