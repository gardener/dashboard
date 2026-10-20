<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container
    fluid
    class="d-flex flex-column overflow-hidden max-h-100"
  >
    <v-card class="ma-3 d-flex flex-column flex-grow-1 overflow-hidden">
      <g-toolbar
        prepend-icon="mdi-view-grid-outline"
        :height="64"
      >
        <div class="text-title-large">
          Projects
        </div>
        <template #append>
          <g-table-search
            v-if="projectList.length"
            v-model="search"
            class="mr-3"
            :examples="['my-project', 'platform team']"
            :exclude-examples="['evaluation', 'former-owner@example.org']"
          />
          <v-btn
            v-if="canCreateProject"
            v-tooltip:top="'Create Project'"
            icon="mdi-plus"
            :to="{ name: 'NewProject', query: { q: search } }"
          />
          <g-table-column-selection
            v-if="projectList.length"
            :headers="selectableHeaders"
            @set-selected-header="setSelectedHeader"
            @reset="resetTableSettings"
          />
        </template>
      </g-toolbar>

      <v-card-text
        v-if="!loading && !projectList.length"
        class="d-flex flex-column flex-grow-1 align-center justify-center text-center"
      >
        <v-icon
          class="mb-4"
          color="primary"
          icon="mdi-view-grid-outline"
          size="64"
        />
        <div class="text-title-large mb-2">
          {{ canCreateProject ? 'Create your first Project' : 'No Projects available' }}
        </div>
        <div class="text-body-medium text-medium-emphasis mb-4">
          <template v-if="canCreateProject">
            Create a Project to organize and manage your clusters.
          </template>
          <template v-else>
            You don't have permission to create a Project. Ask a Project owner or your Gardener administrator for access.
          </template>
        </div>
        <div
          v-tooltip:top="{
            text: 'You are not authorized to create Projects',
            disabled: canCreateProject
          }"
        >
          <v-btn
            :color="canCreateProject ? 'primary' : undefined"
            prepend-icon="mdi-plus"
            :disabled="!canCreateProject"
            :to="canCreateProject ? { name: 'NewProject', query: { q: search } } : undefined"
          >
            Create Project
          </v-btn>
        </div>
      </v-card-text>

      <v-data-table-virtual
        v-else
        v-model:sort-by="projectSortBy"
        :headers="visibleHeaders"
        :items="filteredProjects"
        :loading="loading || !connected"
        :custom-key-sort="customKeySort"
        density="compact"
        :item-height="36"
        hover
        :item-key="getItemKey"
        must-sort
        fixed-header
        class="g-table flex-grow-1 min-h-0px"
      >
        <template #loading>
          Loading projects ...
        </template>
        <template #no-data>
          No projects to show
        </template>
        <template #item="{ item, itemRef }">
          <g-project-list-row
            :ref="itemRef"
            :project="item"
            :headers="visibleHeaders"
          />
        </template>
        <template #bottom>
          <g-data-table-footer
            :items-length="filteredProjects.length"
            items-label="Projects"
          />
        </template>
      </v-data-table-virtual>
    </v-card>

    <g-project-dialog v-model="projectDialog" />
  </v-container>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import {
  useRoute,
  useRouter,
} from 'vue-router'

import { useAuthzStore } from '@/store/authz'
import { useLocalStorageStore } from '@/store/localStorage'
import { useProjectStore } from '@/store/project'
import { useSocketStore } from '@/store/socket'

import GDataTableFooter from '@/components/GDataTableFooter.vue'
import GProjectListRow from '@/components/GProjectListRow.vue'
import GTableColumnSelection from '@/components/GTableColumnSelection.vue'
import GTableSearch from '@/components/GTableSearch.vue'
import GToolbar from '@/components/GToolbar.vue'
import GProjectDialog from '@/components/dialogs/GProjectDialog.vue'

import { getProjectTitle } from '@/composables/useProjectMetadata/helper.js'
import { useShallowRouteSearchQuery } from '@/composables/useRouteSearchQuery'
import { useTableFilter } from '@/composables/useTableFilter'
import {
  defaultFieldMatch,
  parseSearch,
} from '@/composables/useTableFilter/helper'
import { useTableSorting } from '@/composables/useTableSorting'

import { mapTableHeader } from '@/utils'

import filter from 'lodash/filter'
import get from 'lodash/get'
import map from 'lodash/map'

const authzStore = useAuthzStore()
const localStorageStore = useLocalStorageStore()
const projectStore = useProjectStore()
const socketStore = useSocketStore()

const route = useRoute()
const router = useRouter()

const {
  projectList,
  isInitial: loading,
} = storeToRefs(projectStore)
const canCreateProject = computed(() => authzStore.canCreateProjectForNamespace(null))
const { connected } = storeToRefs(socketStore)
const { projectSelectedColumns, projectSortBy } = storeToRefs(localStorageStore)

const { searchQuery: search } = useShallowRouteSearchQuery()
const { compareValues } = useTableSorting()

const projectDialog = computed({
  get () {
    return route.name === 'NewProject'
  },
  set (value) {
    if (!value && route.name === 'NewProject') {
      const { back } = router.options.history.state
      if (back && router.resolve(back).name === 'ProjectList') {
        router.back()
      } else {
        router.replace({ name: 'ProjectList', query: { q: search.value } })
      }
    }
  },
})

const allHeaders = computed(() => [
  {
    title: 'PROJECT NAME',
    key: 'name',
    sortable: true,
    align: 'start',
    defaultSelected: true,
    hidden: false,
    value: item => get(item, ['metadata', 'name'], ''),
  },
  {
    title: 'TITLE',
    key: 'title',
    sortable: true,
    align: 'start',
    defaultSelected: true,
    hidden: false,
    value: item => getProjectTitle(item) || get(item, ['metadata', 'name'], ''),
  },
  {
    title: 'DESCRIPTION',
    key: 'description',
    sortable: true,
    align: 'start',
    defaultSelected: false,
    hidden: false,
    value: item => get(item, ['spec', 'description'], ''),
  },
  {
    title: 'PURPOSE',
    key: 'purpose',
    sortable: true,
    align: 'start',
    defaultSelected: false,
    hidden: false,
    value: item => get(item, ['spec', 'purpose'], ''),
  },
  {
    title: 'OWNER',
    key: 'owner',
    sortable: true,
    align: 'start',
    defaultSelected: false,
    hidden: false,
    value: item => get(item, ['spec', 'owner', 'name'], ''),
  },
  {
    title: 'STATUS',
    key: 'status',
    sortable: true,
    align: 'center',
    defaultSelected: true,
    hidden: false,
    value: projectStatusSortValue,
  },
  {
    title: 'CREATED BY',
    key: 'createdBy',
    sortable: true,
    align: 'start',
    defaultSelected: false,
    hidden: false,
    value: item => get(item, ['spec', 'createdBy', 'name']),
  },
  {
    title: 'CREATED AT',
    key: 'createdAt',
    sortable: true,
    align: 'center',
    defaultSelected: false,
    hidden: false,
    value: item => {
      const timestamp = get(item, ['metadata', 'creationTimestamp'])
      return timestamp ? new Date(timestamp) : null
    },
  },
  {
    title: 'STALENESS',
    key: 'staleness',
    sortable: true,
    align: 'start',
    defaultSelected: false,
    hidden: false,
    value: item => {
      const timestamp = get(item, ['status', 'staleAutoDeleteTimestamp']) ??
        get(item, ['status', 'staleSinceTimestamp'])
      return timestamp ? new Date(timestamp) : null
    },
  },
])

const headers = computed(() => {
  return map(allHeaders.value, header => ({
    ...header,
    class: 'nowrap',
    selected: get(projectSelectedColumns.value, header.key, header.defaultSelected),
  }))
})

const selectableHeaders = computed(() => filter(headers.value, ['hidden', false]))
const visibleHeaders = computed(() => filter(selectableHeaders.value, ['selected', true]))
const defaultSelectedColumns = computed(() => mapTableHeader(headers.value, 'defaultSelected'))

const QUALIFIED_SEARCH_FIELDS = Object.freeze([
  'name',
  'title',
  'description',
  'purpose',
  'owner',
  'createdBy',
  'status',
  'stale',
])

function caseInsensitiveMatch (term, value) {
  return defaultFieldMatch(
    { ...term, value: term.value.toLocaleLowerCase() },
    typeof value === 'string' ? value.toLocaleLowerCase() : value,
  )
}

function projectFilterFn (query) {
  const parsedSearch = parseSearch(query, QUALIFIED_SEARCH_FIELDS)

  return item => {
    const f = getter => ({ get: getter, match: caseInsensitiveMatch })
    const stale = get(item, ['status', 'staleSinceTimestamp']) ? 'stale' : 'active'
    const fields = {
      name: f(() => get(item, ['metadata', 'name'])),
      title: f(() => getProjectTitle(item)),
      description: f(() => get(item, ['spec', 'description'])),
      purpose: f(() => get(item, ['spec', 'purpose'])),
      owner: f(() => get(item, ['spec', 'owner', 'name'])),
      createdBy: f(() => get(item, ['spec', 'createdBy', 'name'])),
      status: f(() => get(item, ['metadata', 'deletionTimestamp']) ? 'deleting' : get(item, ['status', 'phase'])),
      stale: f(() => stale),
    }

    return parsedSearch.matches(fields)
  }
}

const { filteredItems: filteredProjects } = useTableFilter({
  items: projectList,
  searchQuery: search,
  filterFn: projectFilterFn,
})

const customKeySort = {
  name: compareValues,
  title: compareValues,
  description: compareValues,
  purpose: compareValues,
  owner: compareValues,
  status: compareValues,
  createdBy: compareValues,
  createdAt: compareValues,
  staleness: compareValues,
}

function projectStatusSortValue (item) {
  if (get(item, ['metadata', 'deletionTimestamp'])) {
    return 0
  }

  switch (get(item, ['status', 'phase'])) {
    case 'Failed':
      return 1
    case 'Terminating':
      return 2
    case 'Pending':
      return 3
    case 'Ready':
      return 9
    default:
      return 4
  }
}

function setSelectedHeader (header) {
  projectSelectedColumns.value[header.key] = !header.selected
}

function resetTableSettings () {
  projectSelectedColumns.value = defaultSelectedColumns.value
  projectSortBy.value = [{ key: 'title', order: 'asc' }]
}

function getItemKey (item, fallback) {
  return get(item, ['metadata', 'uid'], fallback)
}
</script>
