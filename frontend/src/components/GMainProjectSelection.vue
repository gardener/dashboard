<!--
SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <!-- scroll-y-transition used here - resize transitions cause issues with v-virtual-scroll (e.g., wrong initial scroll position or jumps after a delay) -->
  <v-menu
    v-model="projectMenu"
    location="bottom"
    open-on-click
    :close-on-content-click="false"
    :offset="[0]"
    content-class="project-menu"
    transition="scroll-y-transition"
  >
    <template #activator="{ props }">
      <v-btn
        color="main-background-darken-1"
        v-bind="props"
        block
        rounded="0"
        elevation="4"
        variant="flat"
        class="project-selector text-main-navigation-title"
      >
        <template #prepend>
          <v-icon
            icon="mdi-grid-large"
            :size="24"
          />
        </template>
        <div
          class="text-left"
          :class="{ placeholder: !selectedProject }"
        >
          <div
            v-if="selectedProject"
            class="flex-align-center"
          >
            <g-project-tooltip
              :open-delay="1000"
              :project="selectedProject"
              :open-on-hover="!isAllProjectsItem(selectedProject)"
            >
              <div>{{ selectedProjectName }}</div>
              <div
                v-if="!!selectedProjectTitle"
                class="selected-project-title"
              >
                {{ selectedProjectTitle }}
              </div>
            </g-project-tooltip>

            <template v-if="selectedProject">
              <g-stale-project-warning
                :project="selectedProject"
                size="small"
              />
              <g-not-ready-project-warning
                :project="selectedProject"
                size="small"
              />
            </template>
          </div>
        </div>
        <template #append>
          <v-icon
            :icon="projectMenuIcon"
            :size="18"
          />
        </template>
      </v-btn>
    </template>
    <v-card>
      <template v-if="projectList.length > 3">
        <v-card-title class="pa-0">
          <v-text-field
            ref="refProjectFilter"
            v-model="projectFilter"
            label="Filter projects"
            variant="plain"
            clear-icon="mdi-close"
            clearable
            autofocus
            single-line
            hide-details
            class="project-filter"
            spellcheck="false"
            @keyup.esc="projectFilter = ''"
            @keyup.enter="selectHighlightedProject"
            @update:model-value="onInputProjectFilter"
            @keydown.down.prevent="highlightProjectWithKeys('down')"
            @keydown.up.prevent="highlightProjectWithKeys('up')"
          >
            <template #prepend>
              <v-icon
                icon="mdi-magnify"
                color="primary"
                class="ml-4"
              />
            </template>
          </v-text-field>
        </v-card-title>
        <v-divider />
      </template>
      <v-list variant="flat">
        <v-virtual-scroll
          ref="refProjectVirtualScroll"
          class="project-list"
          :items="sortedAndFilteredProjectItems"
          :item-key="item => item.metadata.uid"
          item-height="62"
        >
          <template #default="{ item }">
            <v-list-item
              :key="item.projectName"
              class="project-tile"
              :class="{
                'highlighted-item': isHighlightedProject(item),
                'selected-item': isSelectedProject(item)
              }"
              :data-g-project-name="item.projectName"
              height="62"
              @click="onProjectClick($event, item)"
            >
              <template #prepend>
                <div class="project-tile-prepend-bar" />
              </template>
              <g-project-tooltip
                :open-delay="1000"
                :project="item"
                :open-on-hover="!isAllProjectsItem(item)"
              >
                <v-list-item-title class="project-name text-uppercase">
                  {{ item.projectName }}
                </v-list-item-title>
                <v-list-item-title class="project-title">
                  {{ item.projectTitle }}
                </v-list-item-title>
                <v-list-item-subtitle class="project-owner">
                  {{ item.projectOwner }}
                </v-list-item-subtitle>
              </g-project-tooltip>
              <template #append>
                <g-stale-project-warning
                  :project="item"
                  size="small"
                />
                <g-not-ready-project-warning
                  :project="item"
                  size="small"
                />
              </template>
            </v-list-item>
          </template>
        </v-virtual-scroll>
      </v-list>
      <v-card-actions>
        <div
          v-tooltip:top="{
            text: 'You are not authorized to create projects',
            disabled: canCreateProject
          }"
          style="width: 100%"
        >
          <v-btn
            variant="text"
            block
            class="project-add text-left text-primary"
            :disabled="!canCreateProject"
            @click.stop="openProjectDialog"
          >
            <v-icon>mdi-plus</v-icon>
            <span class="ml-2">Create Project</span>
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script setup>
import {
  ref,
  computed,
  watch,
  toRef,
  useTemplateRef,
  defineEmits,
} from 'vue'

import { useAuthzStore } from '@/store/authz'
import { useProjectStore } from '@/store/project'

import GStaleProjectWarning from '@/components/GStaleProjectWarning.vue'
import GNotReadyProjectWarning from '@/components/GNotReadyProjectWarning.vue'
import GProjectTooltip from '@/components/GProjectTooltip.vue'

import { getProjectTitle } from '@/composables/useProjectMetadata/helper.js'

import {
  emailToDisplayName,
  setDelayedInputFocus,
} from '@/utils'

import find from 'lodash/find'
import findIndex from 'lodash/findIndex'
import filter from 'lodash/filter'
import sortBy from 'lodash/sortBy'
import toLower from 'lodash/toLower'
import includes from 'lodash/includes'
import replace from 'lodash/replace'
import get from 'lodash/get'
import head from 'lodash/head'
import map from 'lodash/map'

const emit = defineEmits([
  'projectSelect',
  'openProjectDialog',
])

const allProjectsItem = {
  metadata: {
    name: 'All Projects',
  },
  spec: {
    namespace: '_all',
  },
  status: {
    phase: 'Ready',
  },
}

const projectStore = useProjectStore()
const authzStore = useAuthzStore()

const projectFilter = ref('')
const projectMenu = ref(false)
const highlightedProjectName = ref()

const refProjectFilter = useTemplateRef('refProjectFilter')
const refProjectVirtualScroll = useTemplateRef('refProjectVirtualScroll')

const namespace = toRef(projectStore, 'namespace')
const projectList = toRef(projectStore, 'projectList')
const canCreateProject = toRef(authzStore, 'canCreateProject')

const selectedProject = defineModel({ type: Object })

const projectMenuIcon = computed(() => {
  return projectMenu.value ? 'mdi-chevron-up' : 'mdi-chevron-down'
})

const selectedProjectName = computed(() => {
  const project = selectedProject.value
  return project ? project.metadata.name : ''
})

const selectedProjectTitle = computed(() => {
  const project = selectedProject.value
  return project ? getProjectTitle(project) : ''
})

const sortedAndFilteredProjectItems = computed(() => {
  const projectItems = map([allProjectsItem, ...projectList.value], project => {
    const projectOwner = getProjectOwner(project)
    const projectTitle = getProjectTitle(project)
    const projectName = project.metadata.name
    return {
      ...project,
      projectOwner,
      projectTitle,
      projectName,
      normalizedOwner: toLower(replace(projectOwner, /@.*$/, '')),
      normalizedTitle: toLower(projectTitle),
      normalizedName: toLower(projectName),
    }
  })

  const normalizedFilter = toLower(projectFilter.value)

  const predicate = item => {
    if (!projectFilter.value) {
      return true
    }
    return includes(item.normalizedName, normalizedFilter) ||
      includes(item.normalizedOwner, normalizedFilter) ||
      includes(item.normalizedTitle, normalizedFilter)
  }
  const filteredList = filter(projectItems, predicate)

  const exactMatch = item => {
    return item.normalizedName === normalizedFilter ? 0 : 1
  }
  const allProjectsMatch = item => {
    return isAllProjectsItem(item) ? 0 : 1
  }

  const normalizedTitleOrName = item => {
    return item.normalizedTitle || item.normalizedName
  }
  const sortedList = sortBy(filteredList, [allProjectsMatch, exactMatch, normalizedTitleOrName])
  return sortedList
})

const projectNameThatMatchesFilter = computed(() => {
  const item = head(sortedAndFilteredProjectItems.value)
  const singleMatch = sortedAndFilteredProjectItems.value?.length === 1

  return singleMatch
    ? item.projectName
    : undefined
})

function getProjectOwner (project) {
  return emailToDisplayName(get(project, ['spec', 'owner', 'name']))
}

function findProjectCaseInsensitive (projectName) {
  return find(sortedAndFilteredProjectItems.value, project => {
    return toLower(projectName) === toLower(project.metadata.name)
  })
}

function findProjectIndexCaseInsensitive (projectName) {
  return findIndex(sortedAndFilteredProjectItems.value, project => {
    return toLower(projectName) === toLower(project.metadata.name)
  })
}

function selectHighlightedProject () {
  if (!highlightedProjectName.value) {
    return
  }

  const project = findProjectCaseInsensitive(highlightedProjectName.value)
  selectProject(project)
}

function onProjectClick (event, project) {
  if (event.isTrusted) {
    // skip untrusted events - e.g. events triggered via enter key
    selectProject(project)
  }
}

function selectProject (project) {
  projectMenu.value = false

  if (project !== selectedProject.value) {
    selectedProject.value = project
    emit('projectSelect', project)
  }
}

function openProjectDialog () {
  projectMenu.value = false
  emit('openProjectDialog')
}

function onInputProjectFilter () {
  highlightedProjectName.value = undefined

  if (!projectNameThatMatchesFilter.value) {
    return
  }

  highlightedProjectName.value = projectNameThatMatchesFilter.value
}

function highlightProjectWithKeys (keyDirection) {
  const projectName = highlightedProjectName.value ?? selectedProjectName.value

  const currentHighlightedIndex = findProjectIndexCaseInsensitive(projectName)
  let targetIndex = currentHighlightedIndex

  if (targetIndex < 0) {
    // reset index, regardless of key direction
    targetIndex = 0
  } else if (keyDirection === 'up' && currentHighlightedIndex > 0) {
    targetIndex--
  } else if (keyDirection === 'down' && currentHighlightedIndex < sortedAndFilteredProjectItems.value.length - 1) {
    targetIndex++
  }

  const newHighlightedProject = sortedAndFilteredProjectItems.value[targetIndex] // eslint-disable-line security/detect-object-injection -- index controlled internally
  highlightedProjectName.value = newHighlightedProject?.metadata.name

  scrollToActiveProject()
}

function isHighlightedProject (project) {
  return project.metadata.name === highlightedProjectName.value
}

function isSelectedProject (project) {
  return project.metadata.name === selectedProjectName.value
}

function isAllProjectsItem (project) {
  return project?.spec.namespace === allProjectsItem.spec.namespace
}

watch(projectMenu, value => {
  if (value) {
    requestAnimationFrame(() => {
      setDelayedInputFocus(refProjectFilter)
      scrollToActiveProject()
    })
  } else {
    // reset highlighted project name on close
    highlightedProjectName.value = undefined
  }
})

watch(
  namespace,
  () => {
    if (namespace.value === allProjectsItem.spec.namespace) {
      selectedProject.value = allProjectsItem
    } else {
      selectedProject.value = find(projectList.value, [
        'spec.namespace',
        namespace.value,
      ])
    }
  },
  { immediate: true },
)

async function scrollToActiveProject () {
  const activeProjectName = highlightedProjectName.value ?? selectedProject.value?.metadata.name
  if (!activeProjectName || !refProjectVirtualScroll.value) {
    return
  }

  let index = findProjectIndexCaseInsensitive(activeProjectName)
  index = index - 1 //  scroll to one item above the active item
  if (index < 0) {
    return
  }
  refProjectVirtualScroll.value.scrollToIndex(index)
}

</script>

<style lang="scss" scoped>
.project-selector {
  height: 60px !important;
  font-weight: 700;
  font-size: 16px;

  :deep(.v-btn__prepend) {
    margin: 0 24px 0 0 !important;
  }
  :deep(.v-btn__content > div) {
    width: 153px !important;
    text-align: left !important;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  :deep(.v-btn__append) {
    margin: 0 0 0 4px !important;
  }

  .placeholder::before {
    content: 'Project';
    font-weight: 400;
    text-transform: none;
  }

  .flex-align-center {
    display: flex;
    align-items: center
  }

  .selected-project-title {
    text-transform: none;
    font-weight: normal;
    font-size: 14px;
  }
}

.project-menu {
  border-radius: 0 !important;

  .v-card {
    border-radius: 0 !important;

    .project-filter {
      font-weight: normal;

      :deep(.v-field__input) {
        padding-top: 16px;
        padding-bottom: 12px;
      }

      :deep(.v-input__prepend > .v-icon) {
        opacity: 0.9;
      }
    }

    .project-add > div {
      justify-content: left;
    }

    .project-list {
      max-height: calc(100vh - 420px);
      max-width: 255px;

      .project-name {
        font-size: 14px;
      }

      .project-title, .project-owner {
        font-size: 11px;
      }

      .project-tile-prepend-bar {
        width: 4px;
        height: 50px;
        margin: 0 12px 0 -8px;
        background-color: rgba(#c0c0c0, .2);
        border-radius: 4px;
      }

      .highlighted-item {
        background-color: rgba(#c0c0c0, .2) !important;
        font-weight: bold;
      }

      .selected-item {
        .project-tile-prepend-bar {
          background-color: rgb(var(--v-theme-primary));
        }
      }
    }
  }
}
</style>
