<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-container fluid>
    <v-card class="ma-3">
      <g-toolbar
        prepend-icon="mdi-sprout"
        :height="64"
      >
        <div class="text-h6">
          Seeds
        </div>
        <template #append>
          <g-table-search
            v-model="searchQuery"
            :examples="['my-seed', 'aws eu-west-1']"
            :exclude-examples="['azure', 'us-east']"
          />
          <g-table-column-selection
            :headers="selectableHeaders"
            @set-selected-header="setSelectedHeader"
            @reset="resetTableSettings"
          />
        </template>
      </g-toolbar>
      <v-data-table-virtual
        v-model:sort-by="sortBy"
        :headers="visibleHeaders"
        :items="filteredSeeds"
        :loading="loading || !connected"
        :custom-key-sort="customKeySort"
        density="compact"
        hover
        :item-key="getItemKey"
        must-sort
        fixed-header
        class="g-table"
        style="max-height: calc(100vh - 180px)"
      >
        <template #loading>
          Loading seeds ...
        </template>
        <template #no-data>
          No seeds to show
        </template>
        <template #item="{ item }">
          <g-seed-list-row
            :model-value="item"
            :headers="visibleHeaders"
          />
        </template>
        <template #bottom>
          <g-data-table-footer
            :items-length="filteredSeeds.length"
            items-label="Seeds"
          />
        </template>
      </v-data-table-virtual>
    </v-card>
  </v-container>
</template>

<script setup>
import {
  ref,
  computed,
  reactive,
  provide,
  onMounted,
} from 'vue'
import { storeToRefs } from 'pinia'

import { useSeedStore } from '@/store/seed'
import { useSocketStore } from '@/store/socket'
import { useLocalStorageStore } from '@/store/localStorage'

import GToolbar from '@/components/GToolbar.vue'
import GSeedListRow from '@/components/GSeedListRow.vue'
import GDataTableFooter from '@/components/GDataTableFooter.vue'
import GTableColumnSelection from '@/components/GTableColumnSelection.vue'
import GTableSearch from '@/components/GTableSearch.vue'

import { useSeedTableSorting } from '@/composables/useSeedTableSorting'
import { useTableFilter } from '@/composables/useTableFilter'
import { parseSearch } from '@/composables/useTableFilter/helper'
import { useUrlSearchSync } from '@/composables/useUrlSearchSync'
import { getBestSupportedFailureToleranceType } from '@/composables/useSeedItem/helper'

import { mapTableHeader } from '@/utils'
import { errorCodesFromArray } from '@/utils/errorCodes'

import get from 'lodash/get'
import filter from 'lodash/filter'
import map from 'lodash/map'
import join from 'lodash/join'

const seedStore = useSeedStore()
const socketStore = useSocketStore()
const localStorageStore = useLocalStorageStore()

const {
  seedList,
  isInitial: loading,
} = storeToRefs(seedStore)
const { connected } = storeToRefs(socketStore)
const { seedSelectedColumns, seedSortBy } = storeToRefs(localStorageStore)

const activePopoverKey = ref('')
provide('activePopoverKey', activePopoverKey)

const expandedAccessRestrictions = reactive({ default: false })
provide('expandedAccessRestrictions', expandedAccessRestrictions)

const selectedColumns = ref({})

const { search: searchQuery } = useUrlSearchSync()

const allHeaders = computed(() => [
  {
    title: 'NAME',
    key: 'name',
    sortable: true,
    align: 'start',
    defaultSelected: true,
    hidden: false,
    value: item => get(item, ['metadata', 'name'], ''),
  },
  {
    title: 'INFRASTRUCTURE',
    key: 'infrastructure',
    sortable: true,
    align: 'start',
    defaultSelected: true,
    hidden: false,
    value: item => `${get(item, ['spec', 'provider', 'type'], '')} ${get(item, ['spec', 'provider', 'region'], '')}`,
  },
  {
    title: 'STATUS',
    key: 'lastOperation',
    sortable: true,
    align: 'center',
    defaultSelected: true,
    hidden: false,
    value: item => item,
  },
  {
    title: 'READINESS',
    key: 'readiness',
    sortable: true,
    align: 'start',
    defaultSelected: true,
    hidden: false,
    value: item => item,
  },
  {
    title: 'HIGH AVAILABILITY',
    key: 'controlPlaneHighAvailability',
    sortable: true,
    align: 'center',
    defaultSelected: false,
    hidden: false,
    value: item => ({
      failureToleranceType: getBestSupportedFailureToleranceType(item),
      name: get(item, ['metadata', 'name'], ''),
    }),
  },
  {
    title: 'ACCESS RESTRICTIONS',
    key: 'accessRestrictions',
    sortable: false,
    align: 'center',
    defaultSelected: false,
    hidden: false,
    value: item => get(item, ['spec', 'accessRestrictions'], []),
  },
  {
    title: 'SCHEDULING',
    key: 'schedulingVisible',
    sortable: true,
    align: 'center',
    defaultSelected: false,
    hidden: false,
    value: item => get(item, ['spec', 'settings', 'scheduling', 'visible'], false),
  },
  {
    title: 'CREATED AT',
    key: 'createdAt',
    sortable: true,
    align: 'center',
    defaultSelected: false,
    hidden: false,
    value: item => new Date(get(item, ['metadata', 'creationTimestamp'], 0)),
  },
  {
    title: 'VERSION',
    key: 'kubernetesVersion',
    sortable: true,
    align: 'center',
    defaultSelected: true,
    hidden: false,
    value: item => get(item, ['status', 'kubernetesVersion']),
  },
  {
    title: 'GARDENER VERSION',
    key: 'gardenerVersion',
    sortable: true,
    align: 'center',
    defaultSelected: true,
    hidden: false,
    value: item => get(item, ['status', 'gardener', 'version']),
  },
])

const headers = computed(() => {
  return map(allHeaders.value, header => ({
    ...header,
    class: 'nowrap',
    selected: get(selectedColumns.value, header.key, header.defaultSelected),
  }))
})

const selectableHeaders = computed(() => {
  return filter(headers.value, ['hidden', false])
})

const visibleHeaders = computed(() => {
  return filter(selectableHeaders.value, ['selected', true])
})

const currentSelectedColumns = computed(() => {
  return mapTableHeader(headers.value, 'selected')
})

const defaultSelectedColumns = computed(() => {
  return mapTableHeader(headers.value, 'defaultSelected')
})

function seedFilterFn (item, query) {
  const conditions = get(item, ['status', 'conditions'], [])
  const errorCodes = join(errorCodesFromArray(conditions), ' ')
  const accessRestrictionNames = join(map(get(item, ['spec', 'accessRestrictions'], []), 'name'), ' ')

  const searchableFields = [
    get(item, ['metadata', 'name']),
    get(item, ['spec', 'provider', 'type']),
    get(item, ['spec', 'provider', 'region']),
    getBestSupportedFailureToleranceType(item),
    get(item, ['status', 'kubernetesVersion']),
    get(item, ['status', 'gardener', 'version']),
    get(item, ['spec', 'settings', 'scheduling', 'visible']) ? 'visible' : 'hidden',
    errorCodes,
    accessRestrictionNames,
  ]

  const searchQuery = parseSearch(query)
  return searchQuery.matches(searchableFields)
}

const { filteredItems: filteredSeeds } = useTableFilter({
  items: seedList,
  searchQuery,
  filterFn: seedFilterFn,
})

const {
  sortBy,
  customKeySort,
} = useSeedTableSorting({
  defaultSortBy: seedSortBy.value,
  onSortChange: newSortBy => {
    seedSortBy.value = newSortBy
  },
})

function setSelectedHeader (header) {
  selectedColumns.value[header.key] = !header.selected
  saveSelectedColumns()
}

function saveSelectedColumns () {
  seedSelectedColumns.value = currentSelectedColumns.value
}

function resetTableSettings () {
  selectedColumns.value = { ...defaultSelectedColumns.value }
  saveSelectedColumns()
  sortBy.value = [{ key: 'name', order: 'asc' }]
  seedSortBy.value = sortBy.value
}

function updateTableSettings () {
  selectedColumns.value = { ...seedSelectedColumns.value }
}

function getItemKey (item, fallback) {
  return get(item, ['metadata', 'uid'], fallback)
}

onMounted(() => {
  updateTableSettings()
  if (seedSortBy.value?.length) {
    sortBy.value = [...seedSortBy.value]
  }
})
</script>
