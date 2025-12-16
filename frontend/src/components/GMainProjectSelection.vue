<!--
SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-menu
    v-model="projectMenu"
    location="bottom"
    :attach="false"
    :open-delay="100"
    open-on-click
    :close-on-content-click="false"
    :offset="[0]"
    content-class="project-menu"
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
        @keydown.down="highlightProjectWithKeys('down')"
        @keydown.up="highlightProjectWithKeys('up')"
        @keyup.enter="navigateToHighlightedProject"
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
          <div class="flex-align-center">
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
            @keyup.enter="navigateToHighlightedProject"
            @update:model-value="onInputProjectFilter"
            @keydown.down="highlightProjectWithKeys('down')"
            @keydown.up="highlightProjectWithKeys('up')"
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
      <v-list
        ref="refProjectList"
        variant="flat"
        class="project-list"
        @scroll="handleProjectListScroll"
      >
        <v-list-item
          v-for="project in visibleProjectList"
          ref="refProjectListItems"
          :key="project.metadata.name"
          class="project-list-tile"
          :class="{ 'highlighted-item': isHighlightedProject(project) }"
          :data-g-project-name="project.metadata.name"
          @click="onProjectClick($event, project)"
        >
          <template #prepend>
            <v-icon color="primary">
              {{ project.metadata.name === selectedProjectName ? 'mdi-check' : '' }}
            </v-icon>
          </template>
          <g-project-tooltip
            :open-delay="1000"
            :project="project"
            :open-on-hover="!isAllProjectsItem(project)"
          >
            <v-list-item-title class="project-name text-uppercase">
              {{ project.metadata.name }}
            </v-list-item-title>
            <v-list-item-title class="project-title">
              {{ getProjectTitle(project) }}
            </v-list-item-title>
            <v-list-item-subtitle class="project-owner">
              {{ getProjectOwner(project) }}
            </v-list-item-subtitle>
          </g-project-tooltip>
          <template #append>
            <g-stale-project-warning
              :project="project"
              size="small"
            />
            <g-not-ready-project-warning
              :project="project"
              size="small"
            />
          </template>
        </v-list-item>
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
  nextTick,
  watch,
  toRef,
  onMounted,
} from 'vue'
import { useDisplay } from 'vuetify'

import { useAppStore } from '@/store/app'
import { useAuthzStore } from '@/store/authz'
import { useProjectStore } from '@/store/project'

import GStaleProjectWarning from '@/components/GStaleProjectWarning.vue'
import GNotReadyProjectWarning from '@/components/GNotReadyProjectWarning.vue'
import GProjectTooltip from '@/components/GProjectTooltip.vue'

import { getProjectTitle } from '@/composables/useProjectMetadata/helper.js'
import { useProjectMetadata } from '@/composables/useProjectMetadata'

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
import slice from 'lodash/slice'
import last from 'lodash/last'
import isEmpty from 'lodash/isEmpty'

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
const initialVisibleProjects = 10

const projectStore = useProjectStore()
const appStore = useAppStore()
const authzStore = useAuthzStore()
const { mdAndDown } = useDisplay()

const projectDialog = ref(false)
const projectFilter = ref('')
const projectMenu = ref(false)
const highlightedProjectName = ref()
const numberOfVisibleProjects = ref(initialVisibleProjects)

const refProjectFilter = ref(null)
const refProjectList = ref(null)
const refProjectListItems = ref(null)

const namespace = toRef(projectStore, 'namespace')
const projectList = toRef(projectStore, 'projectList')
const sidebar = toRef(appStore, 'sidebar')
const canCreateProject = toRef(authzStore, 'canCreateProject')

const selectedProject = defineModel({ type: Object })

const { projectTitle: selectedProjectTitle } = useProjectMetadata(selectedProject)

const projectMenuIcon = computed(() => {
  return projectMenu.value ? 'mdi-chevron-up' : 'mdi-chevron-down'
})

const selectedProjectName = computed(() => {
  const project = selectedProject.value
  return project ? project.metadata.name : ''
})

const sortedAndFilteredProjectList = computed(() => {
  const predicate = item => {
    if (!projectFilter.value) {
      return true
    }
    const filter = toLower(projectFilter.value)
    const name = toLower(item.metadata.name)
    let owner = get(item, ['spec', 'owner', 'name'])
    owner = toLower(replace(owner, /@.*$/, ''))
    const projectTitle = toLower(getProjectTitle(item) || '')
    return includes(name, filter) || includes(owner, filter) || includes(projectTitle, filter)
  }
  const filteredList = filter([
    allProjectsItem,
    ...projectList.value,
  ], predicate)

  const exactMatch = item => {
    return toLower(item.metadata.name) === toLower(projectFilter.value) ? 0 : 1
  }
  const allProjectsMatch = item => {
    return isAllProjectsItem(item) ? 0 : 1
  }

  const lowerTitleOrName = item => {
    const title = getProjectTitle(item)
    return title ? toLower(title) : toLower(item.metadata.name)
  }
  const sortedList = sortBy(filteredList, [allProjectsMatch, exactMatch, lowerTitleOrName])
  return sortedList
})

const visibleProjectList = computed(() => {
  const projectList = sortedAndFilteredProjectList.value
  const endIndex = numberOfVisibleProjects.value
  return slice(projectList, 0, endIndex)
})

const projectNameThatMatchesFilter = computed(() => {
  const project = head(sortedAndFilteredProjectList.value)
  const projectName = get(project, ['metadata', 'name'])

  const singleMatch = sortedAndFilteredProjectList.value?.length === 1

  return singleMatch
    ? projectName
    : undefined
})

function getProjectOwner (project) {
  return emailToDisplayName(get(project, ['spec', 'owner', 'name']))
}

function findProjectCaseInsensitive (projectName) {
  return find(sortedAndFilteredProjectList.value, project => {
    return toLower(projectName) === toLower(project.metadata.name)
  })
}

function findProjectIndexCaseInsensitive (projectName) {
  return findIndex(sortedAndFilteredProjectList.value, project => {
    return toLower(projectName) === toLower(project.metadata.name)
  })
}

function navigateToHighlightedProject () {
  if (!highlightedProjectName.value) {
    return
  }

  const project = findProjectCaseInsensitive(highlightedProjectName.value)
  navigateToProject(project)
}

function onProjectClick (event, project) {
  if (event.isTrusted) {
    // skip untrusted events - e.g. events triggered via enter key
    navigateToProject(project)
  }
}

function navigateToProject (project) {
  projectMenu.value = false

  if (project !== selectedProject.value) {
    selectedProject.value = project
  }
}

function openProjectDialog () {
  projectMenu.value = false
  projectDialog.value = true
}

function onInputProjectFilter () {
  highlightedProjectName.value = undefined
  numberOfVisibleProjects.value = initialVisibleProjects

  if (!projectNameThatMatchesFilter.value) {
    return
  }

  highlightedProjectName.value = projectNameThatMatchesFilter.value
  nextTick(() => scrollProjectIntoView(highlightedProjectName.value))
}

function highlightProjectWithKeys (keyDirection) {
  const projectName = highlightedProjectName.value ?? selectedProjectName.value

  let currentHighlightedIndex = findProjectIndexCaseInsensitive(projectName)

  if (currentHighlightedIndex < 0) {
    // reset index, regardless of key direction
    currentHighlightedIndex = 0
  } else if (keyDirection === 'up' && currentHighlightedIndex > 0) {
    currentHighlightedIndex--
  } else if (keyDirection === 'down' && currentHighlightedIndex < sortedAndFilteredProjectList.value.length - 1) {
    currentHighlightedIndex++
  }

  const newHighlightedProject = sortedAndFilteredProjectList.value[currentHighlightedIndex] // eslint-disable-line security/detect-object-injection
  highlightedProjectName.value = newHighlightedProject.metadata.name

  if (currentHighlightedIndex >= numberOfVisibleProjects.value - 1) {
    numberOfVisibleProjects.value++
  }

  scrollProjectIntoView(highlightedProjectName.value)
}

function scrollProjectIntoView (projectName, allowRecursion = true) {
  if (!refProjectListItems.value) {
    return
  }

  const projectListItem = refProjectListItems.value.find(child => {
    return child.$attrs['data-g-project-name'] === projectName
  })

  if (allowRecursion && !projectListItem) {
    const index = findProjectIndexCaseInsensitive(projectName)
    const desiredCount = index + 1
    if (desiredCount > numberOfVisibleProjects.value) {
      numberOfVisibleProjects.value = desiredCount

      nextTick(() => {
        const allowRecursion = false // avoid recursive calls, preventing potential endless loop
        scrollProjectIntoView(projectName, allowRecursion)
      })
    }
    return
  }

  if (!projectListItem) {
    return
  }

  const projectListElement = projectListItem.$el
  if (projectListElement) {
    scrollIntoView(projectListElement, false)
  }
}

function scrollIntoView (element, ...args) {
  element.scrollIntoView(...args)
}

function handleProjectListScroll () {
  const projectListElement = refProjectList.value?.$el
  if (!projectListElement) {
    return
  }
  const projectListBottomPosY = projectListElement.getBoundingClientRect().top + projectListElement.getBoundingClientRect().height
  const projectListChildren = refProjectListItems.value
  if (isEmpty(projectListChildren)) {
    return
  }
  const lastProjectElement = last(projectListChildren).$el
  if (!lastProjectElement) {
    return
  }

  const lastProjectElementPosY = projectListBottomPosY - lastProjectElement.getBoundingClientRect().top
  const scrolledToLastElement = lastProjectElementPosY > 0
  if (scrolledToLastElement) {
    // scrolled last element into view
    if (numberOfVisibleProjects.value <= sortedAndFilteredProjectList.value.length) {
      numberOfVisibleProjects.value++
    }
  }
}

function isHighlightedProject (project) {
  return project.metadata.name === highlightedProjectName.value
}

function isAllProjectsItem (project) {
  return project?.spec.namespace === allProjectsItem.spec.namespace
}

onMounted(() => {
  if (mdAndDown.value) {
    sidebar.value = false
  }
})

watch(projectMenu, value => {
  if (value) {
    requestAnimationFrame(() => {
      setDelayedInputFocus(refProjectFilter)
    })
    nextTick(() => scrollProjectIntoView(selectedProjectName.value))
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

    .project-add>div {
      justify-content: left;
    }

    .project-list {
      height: auto;
      max-height: (4 * 48px) + (2 * 8px);
      overflow-y: auto;
      max-width: 255px;

      .project-name {
        font-size: 14px;
      }

      .project-title, .project-owner {
        font-size: 11px;
      }

      :deep(.v-list-item__prepend > .v-icon) {
        opacity: 0.9;
      }

      :deep(.v-list-item__prepend > .v-list-item__spacer) {
        width: 16px;
      }

      .highlighted-item {
        background-color: rgba(#c0c0c0, .2) !important;
        font-weight: bold;
      }
    }
  }
}
</style>
