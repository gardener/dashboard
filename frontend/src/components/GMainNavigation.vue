<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-navigation-drawer
    v-model="sidebar"
    :mobile-breakpoint="400"
    color="main-background"
  >
    <div class="teaser">
      <div class="content center bg-main-background-darken-2">
        <v-btn
          icon="mdi-chevron-double-left"
          variant="text"
          class="float-right text-main-navigation-title ma-2"
          @click.stop="sidebar = false"
        />
        <a href="/">
          <img
            src="/static/assets/logo.svg"
            class="logo"
            alt="gardener logo"
          >
          <h1 class="text-main-navigation-title">Gardener <span class="version">{{ version }}</span></h1>
          <h2 class="text-primary">Universal Kubernetes at Scale</h2>
        </a>
      </div>
    </div>
    <template v-if="projectList.length">
      <v-menu
        v-model="projectMenu"
        location="bottom"
        :attach="true"
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
              {{ selectedProjectName }}
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
              :height="48"
              :class="{ 'highlighted-item': isHighlightedProject(project) }"
              :data-g-project-name="project.metadata.name"
              @click="onProjectClick($event, project)"
            >
              <template #prepend>
                <v-icon color="primary">
                  {{ project.metadata.name === selectedProjectName ? 'mdi-check' : '' }}
                </v-icon>
              </template>
              <v-list-item-title class="project-name text-uppercase">
                {{ project.metadata.name }}
              </v-list-item-title>
              <v-list-item-subtitle class="project-owner">
                {{ getProjectOwner(project) }}
              </v-list-item-subtitle>
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
            <v-tooltip
              location="top"
              :disabled="canCreateProject"
              style="width: 100%"
            >
              <template #activator="{ props }">
                <div v-bind="{ props }">
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
              </template>
              <span>You are not authorized to create projects</span>
            </v-tooltip>
          </v-card-actions>
        </v-card>
      </v-menu>
    </template>

    <v-list
      ref="refMainMenu"
      variant="flat"
      class="main-menu"
    >
      <v-list-item
        v-if="hasNoProjects"
        exact
        :to="{ name: 'Home' }"
        class="bg-main-background"
        active-class="active-item"
      >
        <template #append>
          <v-icon
            size="x-small"
            color="main-navigation-title"
            icon="mdi-home-outline"
          />
        </template>
        <template #title>
          <div class="text-subtitle-1 text-main-navigation-title">
            Home
          </div>
        </template>
      </v-list-item>
      <template v-if="namespace">
        <template v-for="(route, index) in routes">
          <v-list-item
            v-if="!route.meta.menu.hidden"
            :key="index"
            :to="namespacedRoute(route)"
            class="bg-main-background"
            active-class="active-item"
          >
            <template #prepend>
              <v-icon
                size="x-small"
                color="main-navigation-title"
                :icon="route.meta.menu.icon"
              />
            </template>
            <v-list-item-title class="text-uppercase text-main-navigation-title">
              {{ route.meta.menu.title }}
            </v-list-item-title>
          </v-list-item>
        </template>
      </template>
    </v-list>

    <g-project-dialog v-model="projectDialog" />
  </v-navigation-drawer>
</template>

<script setup>
import { ref, computed, nextTick, watch, toRef } from 'vue'
import {
  useAppStore,
  useConfigStore,
  useAuthzStore,
  useProjectStore,
} from '@/store'
import { useRouter, useRoute } from 'vue-router'

import GProjectDialog from '@/components/dialogs/GProjectDialog.vue'
import GStaleProjectWarning from '@/components/GStaleProjectWarning.vue'
import GNotReadyProjectWarning from '@/components/GNotReadyProjectWarning.vue'

import {
  emailToDisplayName,
  setDelayedInputFocus,
  routes as getRoutes,
  namespacedRoute as getNamespacedRoute,
  routeName as getRouteName,
} from '@/utils'

import find from 'lodash/find'
import findIndex from 'lodash/findIndex'
import filter from 'lodash/filter'
import sortBy from 'lodash/sortBy'
import toLower from 'lodash/toLower'
import includes from 'lodash/includes'
import replace from 'lodash/replace'
import get from 'lodash/get'
import has from 'lodash/has'
import head from 'lodash/head'
import slice from 'lodash/slice'
import last from 'lodash/last'

const allProjectsItem = {
  metadata: {
    name: 'All Projects',
    namespace: '_all',
  },
  data: {
    phase: 'Ready',
  },
}
const initialVisibleProjects = 10

const projectStore = useProjectStore()
const appStore = useAppStore()
const configStore = useConfigStore()
const authzStore = useAuthzStore()
const router = useRouter()

const projectDialog = ref(false)
const projectFilter = ref('')
const projectMenu = ref(false)
const highlightedProjectName = ref()
const numberOfVisibleProjects = ref(initialVisibleProjects)

const refProjectFilter = ref(null)
const refProjectList = ref(null)
const refProjectListItems = ref(null)
const refMainMenu = ref(null)

const namespace = toRef(projectStore, 'namespace')
const projectList = toRef(projectStore, 'projectList')
const sidebar = toRef(appStore, 'sidebar')
const version = toRef(configStore, 'appVersion')
const canCreateProject = toRef(authzStore, 'canCreateProject')

const selectedProject = computed({
  get () {
    if (namespace.value === allProjectsItem.metadata.namespace) {
      return allProjectsItem
    }
    return find(projectList.value, ['metadata.namespace', namespace.value])
  },
  set ({ metadata = {} } = {}) {
    router.push(getProjectMenuTargetRoute(metadata.namespace))
  },
})

const hasNoProjects = computed(() => {
  return !projectList.value.length
})

const routes = computed(() => {
  const hasProjectScope = get(selectedProject.value, 'metadata.namespace') !== allProjectsItem.metadata.namespace
  return getRoutes(router, hasProjectScope)
})

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
    const owner = toLower(replace(item.data.owner, /@.*$/, ''))
    return includes(name, filter) || includes(owner, filter)
  }
  const filteredList = filter(projectList.value, predicate)

  const exactMatch = item => {
    return isProjectNameMatchingFilter(item.metadata.name) ? 0 : 1
  }
  const sortedList = sortBy(filteredList, [exactMatch, 'metadata.name'])
  return sortedList
})

const sortedAndFilteredProjectListWithAllProjects = computed(() => {
  if (projectList.value.length > 1) {
    return [
      allProjectsItem,
      ...sortedAndFilteredProjectList.value,
    ]
  }
  return sortedAndFilteredProjectList.value
})

const visibleProjectList = computed(() => {
  const projectList = sortedAndFilteredProjectListWithAllProjects.value
  const endIndex = numberOfVisibleProjects.value
  return slice(projectList, 0, endIndex)
})

const projectFilterHasExactMatch = computed(() => {
  const project = head(sortedAndFilteredProjectList.value)
  const projectName = get(project, 'metadata.name')
  return isProjectNameMatchingFilter(projectName)
})

function getProjectOwner (project) {
  return emailToDisplayName(get(project, 'data.owner'))
}

function namespacedRoute (route) {
  return getNamespacedRoute(route, namespace.value)
}

function findProjectCaseInsensitive (projectName) {
  return find(sortedAndFilteredProjectListWithAllProjects.value, project => {
    return toLower(projectName) === toLower(project.metadata.name)
  })
}

function findProjectIndexCaseInsensitive (projectName) {
  return findIndex(sortedAndFilteredProjectListWithAllProjects.value, project => {
    return toLower(projectName) === toLower(project.metadata.name)
  })
}

function highlightedProject () {
  if (!highlightedProjectName.value) {
    return head(sortedAndFilteredProjectListWithAllProjects.value)
  }
  return findProjectCaseInsensitive(highlightedProjectName.value)
}

function navigateToHighlightedProject () {
  navigateToProject(highlightedProject())
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

function getProjectMenuTargetRoute (namespace) {
  const fallbackToShootList = route => {
    if (namespace === '_all' && get(route, 'meta.projectScope') !== false) {
      return true
    }
    if (has(route, 'params.name')) {
      return true
    }
    if (get(route, 'name') === 'GardenTerminal') {
      return true
    }
    return false
  }
  const route = useRoute()
  if (fallbackToShootList(route)) {
    return {
      name: 'ShootList',
      params: {
        namespace,
      },
    }
  }
  const name = getRouteName(route)
  const key = get(route, 'meta.namespaced') === false
    ? 'query'
    : 'params'
  return {
    name,
    [key]: {
      namespace,
    },
  }
}

function onInputProjectFilter () {
  highlightedProjectName.value = undefined
  numberOfVisibleProjects.value = initialVisibleProjects
  if (projectFilterHasExactMatch.value) {
    highlightedProjectName.value = projectFilter.value
  }

  nextTick(() => scrollHighlightedProjectIntoView())
}

function highlightProjectWithKeys (keyDirection) {
  let currentHighlightedIndex = 0
  if (highlightedProjectName.value) {
    currentHighlightedIndex = findProjectIndexCaseInsensitive(highlightedProjectName.value)
  }

  if (keyDirection === 'up') {
    if (currentHighlightedIndex > 0) {
      currentHighlightedIndex--
    }
  } else if (keyDirection === 'down') {
    if (currentHighlightedIndex < sortedAndFilteredProjectListWithAllProjects.value.length - 1) {
      currentHighlightedIndex++
    }
  }

  const newHighlightedProject = sortedAndFilteredProjectListWithAllProjects.value[currentHighlightedIndex]
  highlightedProjectName.value = newHighlightedProject.metadata.name

  if (currentHighlightedIndex >= numberOfVisibleProjects.value - 1) {
    numberOfVisibleProjects.value++
  }

  scrollHighlightedProjectIntoView()
}

function scrollHighlightedProjectIntoView () {
  if (refProjectListItems.value) {
    return
  }
  const projectListItem = refProjectListItems.value.find(child => {
    return child.$attrs['data-g-project-name'] === highlightedProjectName.value
  })
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
  const projectListElement = refProjectList.value.$el
  if (!projectListElement) {
    return
  }
  const projectListBottomPosY = projectListElement.getBoundingClientRect().top + projectListElement.getBoundingClientRect().height
  const projectListChildren = refProjectListItems.value
  if (!projectListChildren) {
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
    if (numberOfVisibleProjects.value <= sortedAndFilteredProjectListWithAllProjects.value.length) {
      numberOfVisibleProjects.value++
    }
  }
}

function isProjectNameMatchingFilter (projectName) {
  return toLower(projectName) === toLower(projectFilter.value)
}

function isHighlightedProject (project) {
  return project.metadata.name === highlightedProjectName.value
}

watch(projectMenu, value => {
  if (value) {
    requestAnimationFrame(() => {
      setDelayedInputFocus(refProjectFilter)
    })
  }
})

</script>

<style lang="scss" scoped>
$teaserHeight: 200px;

.v-navigation-drawer {
  overflow: hidden;

  .teaser {
    height: $teaserHeight;
    overflow: hidden;

    .content {
      display: block;
      position: relative;
      height: $teaserHeight;
      overflow: hidden;
      text-align: center;

      a {
        text-decoration: none;

        .logo {
          height: 80px;
          pointer-events: none;
          margin: 21px 0 0 0;
          transform: translateX(30%);
        }

        h1 {
          font-size: 40px;
          line-height: 40px;
          padding: 10px 0 0 0;
          margin: 0;
          letter-spacing: 4px;
          font-weight: 100;
          position: relative;

          .version {
            font-size: 10px;
            line-height: 10px;
            letter-spacing: 3px;
            position: absolute;
            top: 6px;
            right: 20px;
          }
        }

        h2 {
          font-size: 15px;
          font-weight: 300;
          padding: 0px;
          margin: 0px;
          letter-spacing: 0.8px;
        }
      }

    }
  }

  .project-selector {
    height: 60px !important;
    font-weight: 700;
    font-size: 16px;

    :deep(.v-btn__prepend) {
      margin: 0 24px 0 0 !important;
    }
    :deep(.v-btn__content > div) {
      min-width: 153px !important;
      text-align: left !important;
    }
    :deep(.v-btn__append) {
      margin: 0 0 0 4px !important;
    }

    .placeholder::before {
      content: 'Project';
      font-weight: 400;
      text-transform: none;
    }
  }

  .project-menu {
    border-radius: 0;

    .v-card {
      border-radius: 0;

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
        height: auto;
        max-height: (4 * 48px) + (2 * 8px);
        overflow-y: auto;
        max-width: 255px;

        .project-name {
          font-size: 14px;
        }

        .project-owner {
          font-size: 11px;
        }

        :deep(.v-list-item__prepend > .v-icon) {
          opacity: 0.9;
        }

        .highlighted-item {
          background-color: rgba(#c0c0c0, .2) !important;
          font-weight: bold;
        }
      }
    }
  }

  .main-menu {
    .active-item {
      background-color: rgba(#fff, .3);
    }
  }
}
</style>
