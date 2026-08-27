<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-sheet
    class="toolbar text-toolbar-title"
    color="toolbar-background"
  >
    <div class="heading">
      <v-icon
        class="heading-icon"
        icon="mdi-hexagon-multiple"
      />
      <div class="heading-title text-title-large">
        Kubernetes Clusters
      </div>
    </div>
    <div class="controls">
      <div class="search-context">
        <div
          class="search"
          :class="{ 'search--expanded': modelValue }"
        >
          <g-table-search
            :model-value="modelValue"
            :examples="['my-shoot', 'John Doe']"
            :exclude-examples="['myproject', 'Jane Doe']"
            fluid
            @update:model-value="$emit('update:modelValue', $event)"
          />
        </div>
        <v-menu
          v-if="!projectScope"
          v-model="operationsViewMenuOpen"
          :activator-props="{ 'aria-haspopup': 'dialog' }"
          :content-props="{
            role: 'dialog',
            'aria-labelledby': 'operations-view-menu-title',
            'aria-describedby': 'operations-view-menu-description operations-view-menu-status',
          }"
          location="bottom end"
        >
          <template #activator="{ props: activatorProps }">
            <v-btn
              v-tooltip:bottom="operationsView.tooltip"
              v-bind="activatorProps"
              class="operations-view"
              :variant="operationsView.isApplied ? 'tonal' : 'text'"
              color="toolbar-title"
              :aria-label="operationsView.tooltip"
              data-test="operations-view-activator"
            >
              <v-icon :icon="operationsView.activatorIcon" />
              <span class="operations-view-label mx-2">
                Operations View
              </span>
              <v-icon
                class="operations-view-chevron"
                :icon="operationsViewMenuOpen ? 'mdi-menu-up' : 'mdi-menu-down'"
                size="small"
              />
            </v-btn>
          </template>
          <v-card class="operations-view-menu">
            <div class="pa-4">
              <div class="operations-view-heading d-flex align-center justify-space-between mb-1">
                <div
                  id="operations-view-menu-title"
                  class="text-title-medium"
                >
                  Operations View
                </div>
                <v-chip
                  id="operations-view-menu-status"
                  :color="operationsView.statusColor"
                  :prepend-icon="operationsView.statusIcon"
                  data-test="operations-view-status"
                  label
                  size="small"
                  variant="tonal"
                >
                  {{ operationsView.statusLabel }}
                </v-chip>
              </div>
              <div
                id="operations-view-menu-description"
                class="text-body-medium text-medium-emphasis"
              >
                Shows unhealthy clusters that may need attention.
              </div>
            </div>
            <v-divider />
            <v-list
              data-test="operations-view-menu-list"
              density="compact"
              tabindex="-1"
            >
              <v-list-item
                v-if="operationsView.state !== 'all'"
                data-test="operations-view-show-all"
                role="button"
                tabindex="0"
                @click="showAllClusters"
              >
                <template #prepend>
                  <v-icon icon="mdi-filter-off-outline" />
                </template>
                <v-list-item-title class="text-wrap">
                  Show all clusters
                </v-list-item-title>
                <v-list-item-subtitle class="operations-view-description text-wrap">
                  Clears every term in the current search.
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item
                v-if="operationsView.state !== 'active'"
                data-test="operations-view-apply"
                role="button"
                tabindex="0"
                @click="applyOperationsView"
              >
                <template #prepend>
                  <v-icon icon="mdi-filter-outline" />
                </template>
                <v-list-item-title class="text-wrap">
                  {{ operationsView.applyActionLabel }}
                </v-list-item-title>
                <v-list-item-subtitle class="operations-view-description text-wrap">
                  {{ operationsView.applyActionDescription }}
                </v-list-item-subtitle>
              </v-list-item>
              <v-divider />
              <v-list-subheader>
                Settings
              </v-list-subheader>
              <v-list-item
                :to="{ name: 'Settings', query: { namespace }, hash: '#setting=default-cluster-view' }"
                data-test="operations-view-default-cluster-view"
                tabindex="0"
              >
                <template #prepend>
                  <v-icon icon="mdi-view-dashboard-outline" />
                </template>
                <v-list-item-title class="text-wrap">
                  Default cluster view
                </v-list-item-title>
                <template #append>
                  <span
                    class="text-body-small text-medium-emphasis mr-1"
                    data-test="operations-view-default-cluster-view-value"
                  >
                    {{ defaultClusterViewLabel }}
                  </span>
                  <v-icon
                    color="medium-emphasis"
                    icon="mdi-chevron-right"
                    size="small"
                  />
                </template>
              </v-list-item>
              <v-list-item
                v-if="canViewLandscape"
                :to="{ name: 'Settings', query: { namespace }, hash: '#setting=cluster-operations' }"
                data-test="operations-view-exclusion-criteria"
                tabindex="0"
              >
                <template #prepend>
                  <v-icon icon="mdi-filter-outline" />
                </template>
                <v-list-item-title class="text-wrap">
                  Edit exclusion criteria…
                </v-list-item-title>
                <template #append>
                  <v-icon
                    color="medium-emphasis"
                    icon="mdi-chevron-right"
                    size="small"
                  />
                </template>
              </v-list-item>
            </v-list>
          </v-card>
        </v-menu>
      </div>
      <g-detail-tooltip
        v-if="issueSinceColumnVisible"
        location="bottom"
        title="Focus mode"
        :width="380"
      >
        <template #activator="{ props: tooltipProps }">
          <div
            class="focus-mode"
          >
            <v-badge
              bordered
              color="primary-lighten-3"
              :content="numberOfNewItemsSinceFreeze"
              :model-value="numberOfNewItemsSinceFreeze > 0"
            >
              <v-switch
                v-model="focusModeInternal"
                v-bind="tooltipProps"
                :aria-label="focusModeInternal ? 'Disable focus mode' : 'Enable focus mode'"
                density="compact"
                color="primary-lighten-3"
                hide-details
              >
                <template #label>
                  <span class="focus-label text-body-large text-toolbar-title">
                    Focus
                  </span>
                </template>
              </v-switch>
            </v-badge>
          </div>
        </template>
        <p class="ma-0">
          Keeps the current cluster list and sorting fixed while cluster data continues to update.
        </p>
        <ul class="focus-mode-details">
          <li>New clusters remain hidden</li>
          <li>Removed clusters appear dimmed</li>
        </ul>
        <template
          v-if="numberOfNewItemsSinceFreeze > 0"
          #footer
        >
          <span class="font-weight-bold">{{ numberOfNewItemsSinceFreeze }}</span>
          {{ numberOfNewItemsSinceFreeze === 1 ? 'new cluster is' : 'new clusters are' }} hidden while focus mode is on.
        </template>
      </g-detail-tooltip>
      <div class="table-actions">
        <v-btn
          v-if="canCreateShoots && projectScope"
          v-tooltip:top="'Create Cluster'"
          icon="mdi-plus"
          color="toolbar-title"
          variant="text"
          :to="{ name: 'NewShoot', params: { namespace } }"
        />
        <g-table-column-selection
          activator-color="toolbar-title"
          activator-variant="text"
          :headers="selectableHeaders"
          @set-selected-header="$emit('setSelectedHeader', $event)"
          @reset="$emit('reset')"
        />
      </div>
    </div>
  </v-sheet>
</template>

<script setup>
import {
  computed,
  ref,
} from 'vue'

import { parseShootSearch } from '@/store/shoot/helper'
import { buildSearchTerms } from '@/store/shoot/search'

import GTableColumnSelection from '@/components/GTableColumnSelection.vue'
import GDetailTooltip from '@/components/GDetailTooltip.vue'
import GTableSearch from '@/components/GTableSearch.vue'

import { useShootListFilters } from '@/composables/useShootListFilters'

import isEqual from 'lodash/isEqual'
import sortBy from 'lodash/sortBy'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  namespace: {
    type: String,
    required: true,
  },
  projectScope: {
    type: Boolean,
    default: false,
  },
  canViewLandscape: {
    type: Boolean,
    default: false,
  },
  canCreateShoots: {
    type: Boolean,
    default: false,
  },
  issueSinceColumnVisible: {
    type: Boolean,
    default: false,
  },
  focusMode: {
    type: Boolean,
    default: false,
  },
  numberOfNewItemsSinceFreeze: {
    type: Number,
    default: 0,
  },
  selectableHeaders: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits([
  'update:modelValue',
  'update:focusMode',
  'setSearch',
  'setSelectedHeader',
  'reset',
])

const operationsViewMenuOpen = ref(false)

const {
  operationsViewFilters,
  defaultClusterView,
} = useShootListFilters()

const operationsViewSearch = computed(() => {
  return buildSearchTerms(operationsViewFilters.value)
})

function canonicalSearchTerms (search) {
  return sortBy(parseShootSearch(search).terms, ['field', 'value', 'exact', 'exclude'])
}

const operationsViewSearchTerms = computed(() => {
  return canonicalSearchTerms(operationsViewSearch.value)
})

const defaultClusterViewLabel = computed(() => {
  return defaultClusterView.value === 'operations'
    ? 'Operations View'
    : 'All clusters'
})

const operationsView = computed(() => {
  const shootSearchTerms = canonicalSearchTerms(props.modelValue)
  if (!shootSearchTerms.length) {
    return {
      state: 'all',
      isApplied: false,
      activatorIcon: 'mdi-filter-off-outline',
      statusLabel: 'All clusters',
      statusIcon: 'mdi-filter-off-outline',
      tooltip: 'Operations View — showing all clusters',
      applyActionLabel: 'Apply Operations View',
      applyActionDescription: 'Uses the Operations View criteria to show clusters that may need attention.',
    }
  }

  if (isEqual(shootSearchTerms, operationsViewSearchTerms.value)) {
    return {
      state: 'active',
      isApplied: true,
      activatorIcon: 'mdi-filter-check-outline',
      statusLabel: 'Active',
      statusIcon: 'mdi-check-circle-outline',
      statusColor: 'primary',
      tooltip: 'Operations View is active',
    }
  }

  const hasOperationsViewTerms = operationsViewSearchTerms.value.every(searchTerm => {
    return shootSearchTerms.some(shootSearchTerm => isEqual(shootSearchTerm, searchTerm))
  })
  if (hasOperationsViewTerms) {
    return {
      state: 'refined',
      isApplied: true,
      activatorIcon: 'mdi-filter-plus-outline',
      statusLabel: 'Additional filters',
      statusIcon: 'mdi-filter-plus-outline',
      statusColor: 'primary',
      tooltip: 'Operations View with additional filters',
      applyActionLabel: 'Reset to Operations View',
      applyActionDescription: 'Removes every additional term from the current search.',
    }
  }

  return {
    state: 'custom',
    isApplied: false,
    activatorIcon: 'mdi-filter-cog-outline',
    statusLabel: 'Custom search',
    statusIcon: 'mdi-pencil-outline',
    tooltip: 'Operations View — custom search',
    applyActionLabel: 'Apply Operations View',
    applyActionDescription: 'Replaces every term in the current search with the Operations View criteria.',
  }
})

const focusModeInternal = computed({
  get () {
    return props.focusMode
  },
  set (value) {
    emit('update:focusMode', value)
  },
})

function showAllClusters () {
  emit('setSearch', '')
}

function applyOperationsView () {
  emit('setSearch', operationsViewSearch.value)
}
</script>

<style lang="scss" scoped>
.toolbar {
  align-items: center;
  box-sizing: border-box;
  column-gap: 16px;
  display: grid;
  flex-shrink: 0;
  grid-template-columns: minmax(0, 1fr) auto;
  min-height: 64px;
  padding: 0 8px 0 16px;
}

.heading {
  align-items: center;
  display: flex;
  min-width: 0;
}

.heading-icon {
  flex: 0 0 auto;
  margin-inline-end: 16px;
}

.heading-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.controls,
.search-context,
.table-actions {
  align-items: center;
  display: flex;
}

.controls,
.search-context {
  min-width: 0;
}

.search-context {
  column-gap: 8px;
  flex: 0 1 auto;
  margin-inline-end: 8px;
}

.search {
  flex: 0 1 auto;
  width: clamp(240px, 24vw, 360px);

  &:focus-within,
  &--expanded {
    width: clamp(400px, 42vw, 700px);
  }
}

.operations-view {
  flex: 0 0 auto;
  letter-spacing: normal;
  text-transform: none;
}

.operations-view-label {
  white-space: nowrap;
}

.operations-view-menu {
  width: min(420px, calc(100vw - 32px));
}

.operations-view-heading {
  flex-wrap: wrap;
  gap: 12px;
}

.operations-view-description {
  -webkit-line-clamp: unset;
}

.focus-mode {
  flex: 0 0 auto;
  margin-inline-start: 8px;
}

.focus-label {
  white-space: nowrap;
  word-break: normal;
}

.focus-mode-details {
  display: grid;
  gap: 4px;
  margin: 0;
  padding-inline-start: 20px;
}

.table-actions {
  flex: 0 0 auto;
}

@media (max-width: 1200px) {
  .toolbar {
    column-gap: 4px;
    grid-template-columns: minmax(0, 1fr) auto auto;
    grid-template-rows: minmax(64px, auto) auto;
  }

  .heading {
    grid-column: 1;
    grid-row: 1;
  }

  .controls {
    display: contents;
  }

  .search-context {
    box-sizing: border-box;
    grid-column: 1 / -1;
    grid-row: 2;
    margin: 0;
    padding: 0 8px 12px 0;
    width: 100%;
  }

  .search {
    flex: 1 1 auto;
    width: auto;

    &:focus-within,
    &--expanded {
      width: 100%;
    }
  }

  .focus-mode {
    grid-column: 2;
    grid-row: 1;
  }

  .table-actions {
    grid-column: 3;
    grid-row: 1;
  }
}

@media (max-width: 1000px) {
  .operations-view {
    min-width: 40px;
    padding-inline: 0;
    width: 40px;
  }

  .operations-view-label,
  .operations-view-chevron {
    display: none;
  }
}

@media (max-width: 600px) {
  .toolbar {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: minmax(64px, auto) auto auto;
  }

  .heading {
    grid-column: 1 / -1;
  }

  .search-context {
    padding-inline-end: 8px;
  }

  .focus-mode {
    grid-column: 1;
    grid-row: 3;
    margin-inline-start: 8px;
  }

  .table-actions {
    grid-column: 2;
    grid-row: 3;
    padding-bottom: 8px;
  }
}
</style>
