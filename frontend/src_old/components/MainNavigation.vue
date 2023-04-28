<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

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
    v-model="isActive"
    :mobile-breakpoint="400"
    color="main-background"
  >
    <div class="teaser">
      <div class="content center bg-main-background-darken-2">
        <v-btn @click.stop="setSidebar(!isActive)" icon variant="text" class="float-right text-main-navigation-title ma-2">
          <v-icon>mdi-chevron-double-left</v-icon>
        </v-btn>
        <a href="/">
          <img src="/static/assets/logo.svg" class="logo" alt="gardener logo">
          <h1 class="text-main-navigation-title">Gardener <span class="version">{{version}}</span></h1>
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
        :attach="true"
        location="bottom"
        open-on-click
        :close-on-content-click="false"
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
            class="project-selector elevation-4 text-main-navigation-title"
            @keydown.down="highlightProjectWithKeys('down')"
            @keydown.up="highlightProjectWithKeys('up')"
            @keyup.enter="navigateToHighlightedProject"
          >
            <v-icon class="pr-6">mdi-grid-large</v-icon>
            <span class="ml-2" :class="{ placeholder: !selectedProject }" >{{selectedProjectName}}</span>
            <template v-if="selectedProject">
              <stale-project-warning :project="selectedProject" small></stale-project-warning>
              <not-ready-project-warning :project="selectedProject" small></not-ready-project-warning>
            </template>
            <v-spacer></v-spacer>
            <v-icon end>{{projectMenuIcon}}</v-icon>
          </v-btn>
        </template>

        <v-card>
          <template v-if="projectList.length > 3">
            <!-- TODO: v-card-title used the no longer existing "flat" attr.
              This attr is cosmetical. Check how it looks without it in Vue3
            -->
            <v-card-title class="pa-0">
              <v-text-field
                clearable
                label="Filter projects"
                variant="solo"
                single-line
                hide-details
                prepend-icon="mdi-magnify"
                class="pl-4 mt-0 pt-0 project-filter"
                v-model="projectFilter"
                ref="projectFilter"
                @keyup.esc="projectFilter = ''"
                @keyup.enter="navigateToHighlightedProject"
                @update:model-value="onInputProjectFilter"
                @keydown.down="highlightProjectWithKeys('down')"
                @keydown.up="highlightProjectWithKeys('up')"
                autofocus
              >
              </v-text-field>
            </v-card-title>
            <v-divider></v-divider>
          </template>
          <v-list variant="flat" class="project-list" ref="projectList" @scroll="handleProjectListScroll">
            <v-list-item
              v-for="project in visibleProjectList"
              ref="projectListItems"
              @click="onProjectClick($event, project)"
              class="project-list-tile"
              :class="{'highlighted-item' : isHighlightedProject(project)}"
              :key="project.metadata.name"
              :data-g-project-name="project.metadata.name"
            >
              <template v-slot:prepend>
                <v-icon color="primary">
                  {{ project.metadata.name === selectedProjectName ? 'mdi-check' : ''}}
                </v-icon>
              </template>
              <template v-slot:title>
                <div class="project-name">{{project.metadata.name}}</div>
              </template>
              <template v-slot:subtitle>
                <div class="project-owner">{{getProjectOwner(project)}}</div>
              </template>
              <template v-slot:append>
                <stale-project-warning :project="project" small></stale-project-warning>
                <not-ready-project-warning :project="project" small></not-ready-project-warning>
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
    <v-list ref="mainMenu" class="main-menu" variant="flat">
      <v-list-item :to="{name: 'Home'}" exact v-if="hasNoProjects">
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
              <div class="text-subtitle-1 text-main-navigation-title" >{{route.meta.menu.title}}</div>
            </template>
            <template v-slot:append>
              <v-icon size="small" color="main-navigation-title">{{route.meta.menu.icon}}</v-icon>
            </template>
          </v-list-item>
        </template>
      </template>
    </v-list>

    <project-create-dialog v-model:value="projectDialog"></project-create-dialog>

  </v-navigation-drawer>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
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
import { emailToDisplayName, setDelayedInputFocus, routes, namespacedRoute, routeName } from '@/utils'
import ProjectCreateDialog from '@/components/dialogs/ProjectDialog.vue'
import StaleProjectWarning from '@/components/StaleProjectWarning.vue'
import NotReadyProjectWarning from '@/components/NotReadyProjectWarning.vue'

const initialVisibleProjects = 10

export default {
  components: {
    ProjectCreateDialog,
    StaleProjectWarning,
    NotReadyProjectWarning
  },
  data () {
    return {
      projectDialog: false,
      projectFilter: '',
      projectMenu: false,
      allProjectsItem: { metadata: { name: 'All Projects', namespace: '_all' }, data: { phase: 'Ready' } },
      highlightedProjectName: undefined,
      numberOfVisibleProjects: initialVisibleProjects
    }
  },
  computed: {
    ...mapState([
      'namespace',
      'sidebar',
      'cfg'
    ]),
    ...mapGetters([
      'canCreateProject',
      'projectList'
    ]),
    version () {
      return get(this.cfg, 'appVersion', import.meta.env.VUE_APP_VERSION)
    },
    isActive: {
      get () {
        return this.sidebar
      },
      set (val) {
        this.setSidebar(val)
      }
    },
    selectedProject: {
      get () {
        if (this.namespace === this.allProjectsItem.metadata.namespace) {
          return this.allProjectsItem
        }
        const predicate = item => item.metadata.namespace === this.namespace
        return find(this.projectList, predicate)
      },
      set ({ metadata = {} } = {}) {
        const namespace = metadata.namespace
        const route = this.getProjectMenuTargetRoute(namespace)
        this.$router.push(route)
      }
    },
    hasNoProjects () {
      return !this.projectList.length
    },
    routes () {
      const hasProjectScope = get(this.selectedProject, 'metadata.namespace') !== this.allProjectsItem.metadata.namespace
      return routes(this.$router, hasProjectScope)
    },
    projectMenuIcon () {
      return this.projectMenu ? 'mdi-chevron-up' : 'mdi-chevron-down'
    },
    selectedProjectName () {
      const project = this.selectedProject
      return project ? project.metadata.name : ''
    },
    sortedAndFilteredProjectList () {
      const predicate = item => {
        if (!this.projectFilter) {
          return true
        }
        const filter = toLower(this.projectFilter)
        const name = toLower(item.metadata.name)
        const owner = toLower(replace(item.data.owner, /@.*$/, ''))
        return includes(name, filter) || includes(owner, filter)
      }
      const filteredList = filter(this.projectList, predicate)

      const exactMatch = item => {
        return this.isProjectNameMatchingFilter(item.metadata.name) ? 0 : 1
      }
      const sortedList = sortBy(filteredList, [exactMatch, 'metadata.name'])
      return sortedList
    },
    sortedAndFilteredProjectListWithAllProjects () {
      if (this.projectList.length > 1) {
        return [this.allProjectsItem, ...this.sortedAndFilteredProjectList]
      }
      return this.sortedAndFilteredProjectList
    },
    visibleProjectList () {
      const projectList = this.sortedAndFilteredProjectListWithAllProjects
      const endIndex = this.numberOfVisibleProjects
      return slice(projectList, 0, endIndex)
    },
    getProjectOwner () {
      return (project) => {
        return emailToDisplayName(get(project, 'data.owner'))
      }
    },
    namespacedRoute () {
      return (route) => {
        return namespacedRoute(route, this.namespace)
      }
    },
    projectFilterHasExactMatch () {
      const project = head(this.sortedAndFilteredProjectList)
      const projectName = get(project, 'metadata.name')
      return this.isProjectNameMatchingFilter(projectName)
    }
  },
  methods: {
    ...mapActions([
      'setSidebar'
    ]),
    findProjectCaseInsensitive (projectName) {
      return find(this.sortedAndFilteredProjectListWithAllProjects, project => {
        return toLower(projectName) === toLower(project.metadata.name)
      })
    },
    findProjectIndexCaseInsensitive (projectName) {
      return findIndex(this.sortedAndFilteredProjectListWithAllProjects, project => {
        return toLower(projectName) === toLower(project.metadata.name)
      })
    },
    highlightedProject () {
      if (!this.highlightedProjectName) {
        return head(this.sortedAndFilteredProjectListWithAllProjects)
      }
      return this.findProjectCaseInsensitive(this.highlightedProjectName)
    },
    navigateToHighlightedProject () {
      this.navigateToProject(this.highlightedProject())
    },
    onProjectClick (event, project) {
      if (event.isTrusted) {
        // skip untrusted events - e.g. events triggered via enter key
        this.navigateToProject(project)
      }
    },
    navigateToProject (project) {
      this.projectMenu = false

      if (project !== this.selectedProject) {
        this.selectedProject = project
      }
    },
    openProjectDialog () {
      this.projectMenu = false
      this.projectDialog = true
    },
    getProjectMenuTargetRoute (namespace) {
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
      if (fallbackToShootList(this.$route)) {
        return {
          name: 'ShootList',
          params: {
            namespace
          }
        }
      }
      const name = routeName(this.$route)
      const key = get(this.$route, 'meta.namespaced') === false
        ? 'query'
        : 'params'
      return {
        name,
        [key]: {
          namespace
        }
      }
    },
    onInputProjectFilter () {
      this.highlightedProjectName = undefined
      this.numberOfVisibleProjects = initialVisibleProjects
      if (this.projectFilterHasExactMatch) {
        this.highlightedProjectName = this.projectFilter
      }

      this.$nextTick(() => this.scrollHighlightedProjectIntoView())
    },
    highlightProjectWithKeys (keyDirection) {
      let currentHighlightedIndex = 0
      if (this.highlightedProjectName) {
        currentHighlightedIndex = this.findProjectIndexCaseInsensitive(this.highlightedProjectName)
      }

      if (keyDirection === 'up') {
        if (currentHighlightedIndex > 0) {
          currentHighlightedIndex--
        }
      } else if (keyDirection === 'down') {
        if (currentHighlightedIndex < this.sortedAndFilteredProjectListWithAllProjects.length - 1) {
          currentHighlightedIndex++
        }
      }

      const newHighlightedProject = this.sortedAndFilteredProjectListWithAllProjects[currentHighlightedIndex]
      this.highlightedProjectName = newHighlightedProject.metadata.name

      if (currentHighlightedIndex >= this.numberOfVisibleProjects - 1) {
        this.numberOfVisibleProjects++
      }

      this.scrollHighlightedProjectIntoView()
    },
    scrollHighlightedProjectIntoView () {
      if (!this.$refs.projectListItems) {
        return
      }
      const projectListItem = this.$refs.projectListItems.find((child) => {
        return child.$attrs['data-g-project-name'] === this.highlightedProjectName
      })
      if (!projectListItem) {
        return
      }

      const projectListElement = projectListItem.$el
      if (projectListElement) {
        this.scrollIntoView(projectListElement, false)
      }
    },
    scrollIntoView (element, ...args) {
      element.scrollIntoView(...args)
    },
    handleProjectListScroll () {
      const projectListElement = this.$refs.projectList.$el
      if (!projectListElement) {
        return
      }
      const projectListBottomPosY = projectListElement.getBoundingClientRect().top + projectListElement.getBoundingClientRect().height
      const projectListChildren = this.$refs.projectListItems
      if (!projectListChildren) {
        return
      }
      const lastProjectElement = get(last(projectListChildren), '$el')
      if (!lastProjectElement) {
        return
      }

      const lastProjectElementPosY = projectListBottomPosY - lastProjectElement.getBoundingClientRect().top
      const scrolledToLastElement = lastProjectElementPosY > 0
      if (scrolledToLastElement) {
        // scrolled last element into view
        if (this.numberOfVisibleProjects <= this.sortedAndFilteredProjectListWithAllProjects.length) {
          this.numberOfVisibleProjects++
        }
      }
    },
    isProjectNameMatchingFilter (projectName) {
      return toLower(projectName) === toLower(this.projectFilter)
    },
    isHighlightedProject (project) {
      return project.metadata.name === this.highlightedProjectName
    }
  },
  watch: {
    projectMenu (value) {
      if (value) {
        requestAnimationFrame(() => {
          setDelayedInputFocus(this, 'projectFilter')
        })
      }
    }
  }
}
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

    .v-footer{
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
          align-items: center;
          font-weight: normal;
        }

        .project-add > div {
          justify-content: left;
        }

        .project-list {
          height: auto;
          max-height: (4 * 54px) + (2 * 8px);
          overflow-y: auto;
          max-width: 300px;

          div > a {
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
