<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <!-- TODO: v-navigation-drawer used the no longer existing "fixed" attr. There is no such prop in vuetify 3.
        Removed for now but need to check if the behavior is still as desired. "fixed" applied a CSS position: fixed.
  -->
  <!-- TODO: v-navigation-drawer used the no longer existing "app" attr. There is no such prop in vuetify 3.
        Removed for now but need to check if the behavior is still as desired.
  -->
  <v-navigation-drawer
    v-model="sidebar"
    :mobile-breakpoint="400"
    color="main-background"
  >
    <div class="teaser">
      <div class="content center bg-main-background-darken-2">
        <v-btn @click.stop="sidebar = false" icon variant="text" class="float-right text-main-navigation-title ma-2">
          <v-icon>mdi-chevron-double-left</v-icon>
        </v-btn>
        <a href="/">
          <img src="/static/assets/logo.svg" class="logo" alt="gardener logo">
          <h1 class="text-main-navigation-title">Gardener <span class="version">{{ version }}</span></h1>
          <h2 class="text-primary">Universal Kubernetes at Scale</h2>
        </a>
      </div>
    </div>
    <template v-if="projectList.length">
      <!-- TODO: v-menu used the no longer existing "allow-overflow" attr.
              Removed for now but need to check if the behavior is still as desired.
      -->
      <!-- TODO: When placing the menu "bottom left" there is a small margin on the left.
            Also the positioning is not consistent when opening it multiple times. There seem to be GitHub issues for
            the vuetify "v-menu" component where the popover placement in a RTL layout is also broken. Eventually the
            placement of the dropdown in general is buggy as of now: https://github.com/vuetifyjs/vuetify/issues/16797
      -->
      <v-menu
        location="bottom"
        :attach="true"
        open-on-click
        :close-on-content-click="false"
        :offset="[0]"
        content-class="project-menu"
        v-model="projectMenu"
      >
        <template v-slot:activator="{ props }">
          <!-- TODO: under vuetfiy2 the button stretched across the whole available width (using flex: 1 0 auto on the span.v-btn__content).
                Now the button content shrinks to width it actually needs. This probably will cause misalignment of the icons in the dropdown
                and the menu items in the v-card>v-list below.
          -->
          <v-btn
            color="main-background-darken-1"
            v-bind="props"
            block
            rounded="0"
            elevation="4"
            variant="flat"
            class="project-selector text-main-navigation-title px-0"
            :append-icon="projectMenuIcon"
            @keydown.down="highlightProjectWithKeys('down')"
            @keydown.up="highlightProjectWithKeys('up')"
            @keyup.enter="navigateToHighlightedProject"
          >
            <template v-slot:prepend>
              <v-icon icon="mdi-grid-large" />
            </template>
            <div style="width: 132px;" class="ml-6 text-left" :class="{ placeholder: !selectedProject }" >
              {{ selectedProjectName }}
              <template v-if="selectedProject">
                <g-stale-project-warning :project="selectedProject" size="small" />
                <g-not-ready-project-warning :project="selectedProject" size="small" />
              </template>
            </div>
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
              <template v-slot:prepend>
                <v-icon icon="mdi-magnify" class="mx-2"></v-icon>
              </template>
              </v-text-field>
            </v-card-title>
            <v-divider></v-divider>
          </template>
          <v-list variant="flat" class="project-list" ref="refProjectList" @scroll="handleProjectListScroll">
            <v-list-item
              v-for="project in visibleProjectList"
              ref="refProjectListItems"
              @click="onProjectClick($event, project)"
              class="project-list-tile"
              :class="{ 'highlighted-item': isHighlightedProject(project) }"
              :key="project.metadata.name"
              :data-g-project-name="project.metadata.name"
            >
              <template v-slot:prepend>
                <v-icon color="primary">
                  {{ project.metadata.name === selectedProjectName ? 'mdi-check' : '' }}
                </v-icon>
              </template>
              <template v-slot:title>
                <div class="project-name">{{ project.metadata.name }}</div>
              </template>
              <template v-slot:subtitle>
                <div class="project-owner">{{ getProjectOwner(project) }}</div>
              </template>
              <template v-slot:append>
                <g-stale-project-warning :project="project" size="small" />
                <g-not-ready-project-warning :project="project" size="small" />
              </template>
            </v-list-item>
          </v-list>
          <v-card-actions>
            <v-tooltip location="top" :disabled="canCreateProject" style="width: 100%">
              <template v-slot:activator="{ props }">
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
    <v-list ref="refMainMenu" class="main-menu" variant="flat">
      <v-list-item :to="{ name: 'Home' }" exact v-if="hasNoProjects">
        <template v-slot:title>
          <div class="text-subtitle-1 text-main-navigation-title">Home</div>
        </template>
        <template v-slot:append>
          <v-icon size="small" color="main-navigation-title">mdi-home-outline</v-icon>
        </template>
      </v-list-item>
      <template v-if="namespace">
        <template v-for="(route, index) in routes">
          <v-list-item v-if="!route.meta.menu.hidden" :to="namespacedRoute(route)" :key="index" active-class="active-item">
            <template v-slot:title>
              <div class="text-subtitle-1 text-main-navigation-title" >{{ route.meta.menu.title }}</div>
            </template>
            <template v-slot:append>
              <v-icon size="small" color="main-navigation-title">{{ route.meta.menu.icon }}</v-icon>
            </template>
          </v-list-item>
        </template>
      </template>
    </v-list>

    <!-- TODO project-create-dialog v-model:value="projectDialog"></project-create-dialog -->

  </v-navigation-drawer>
</template>

<script setup>
  import { ref, computed, nextTick, watch, toRef } from 'vue'
  import {
    useAppStore,
    useConfigStore,
    useAuthnzStore,
    useProjectStore,
  } from '@/store'
  import { useRouter, useRoute } from 'vue-router'

  // import ProjectCreateDialog from '@/components/dialogs/ProjectDialog.vue'
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
  const authzStore = useAuthnzStore()
  const router = useRouter()
  const route = useRoute()

  // eslint-disable-next-line no-unused-vars
  const projectDialog = ref( false)
  const projectFilter = ref( '')
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

  const getProjectOwner = computed(() => {
    return (project) => {
      return emailToDisplayName(get(project, 'data.owner'))
    }
  })

  const namespacedRoute = computed(() => {
    return (route) => {
      return getNamespacedRoute(route, namespace.value)
    }
  })

  const projectFilterHasExactMatch = computed(() => {
    const project = head(sortedAndFilteredProjectList.value)
    const projectName = get(project, 'metadata.name')
    return isProjectNameMatchingFilter(projectName)
  })

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

    .placeholder::before {
      content: 'Project';
      font-weight: 400;
      text-transform: none;
    }
  }

  .v-footer {
    background-color: transparent;
    padding-left: 8px;
    padding-right: 8px;
  }

  .v-list {
    .v-list-item__title {
      text-transform: uppercase !important;
      max-width: 180px;
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
      }

      .project-add>div {
        justify-content: left;
      }

      .project-list {
        height: auto;
        max-height: (4 * 54px) + (2 * 8px);
        overflow-y: auto;
        max-width: 300px;

        div>a {
          height: 54px;
        }

        .project-name {
          font-size: 14px;
        }

        .project-owner {
          font-size: 11px;
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
