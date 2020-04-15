<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
    <v-navigation-drawer
      v-model="isActive"
      fixed
      app
      :mobile-break-point="400"
      dark
    >
      <div class="teaser">
        <div class="content center">
          <v-btn @click.native.stop="setSidebar(!isActive)" icon class="float-right white--text ma-2">
            <v-icon>mdi-chevron-double-left</v-icon>
          </v-btn>
          <a href="/">
            <img src="../assets/logo.svg" class="logo">
            <h1 class="white--text">Gardener <span class="version">{{version}}</span></h1>
            <h2>Universal Kubernetes at Scale</h2>
          </a>
        </div>
      </div>
      <template v-if="projectList.length">
        <v-menu
          light
          attach
          offset-y
          left
          bottom
          allow-overflow
          open-on-click
          :close-on-content-click="false"
          content-class="project-menu"
          v-model="projectMenu"
        >
          <template v-slot:activator="{ on }">
            <v-btn
              v-on="on"
              block
              class="project-selector elevation-4 white--text"
              @keydown.down="highlightProjectWithKeys('down')"
              @keydown.up="highlightProjectWithKeys('up')"
              @keyup.enter="navigateToHighlightedProject"
            >
              <v-icon class="pr-6">mdi-grid-large</v-icon>
              <span class="ml-2">{{projectName}}</span>
              <v-spacer></v-spacer>
              <v-icon right>{{projectMenuIcon}}</v-icon>
            </v-btn>
          </template>

          <v-card>
            <template v-if="projectList.length > 3">
              <v-card-title class="pa-0 grey lighten-5">
                <v-text-field
                  clearable
                  label="Filter projects"
                  solo
                  flat
                  single-line
                  hide-details
                  full-width
                  color="grey darken-1"
                  prepend-icon="search"
                  class="pl-4 mt-0 pt-0 project-filter"
                  v-model="projectFilter"
                  ref="projectFilter"
                  @keyup.esc="projectFilter = ''"
                  @keyup.enter="navigateToHighlightedProject"
                  @input="onInputProjectFilter"
                  @keydown.down="highlightProjectWithKeys('down')"
                  @keydown.up="highlightProjectWithKeys('up')"
                  autofocus
                >
                </v-text-field>
              </v-card-title>
              <v-divider></v-divider>
            </template>
            <v-list light class="project-list" ref="projectList" @scroll.native="handleProjectListScroll">
              <v-list-item
                class="project-list-tile"
                v-for="project in visibleProjectList"
                @click="onProjectClick($event, project)"
                :class="{'grey lighten-4' : isHighlightedProject(project)}"
                :key="project.metadata.name"
                :data-g-project-name="project.metadata.name"
              >
                <v-list-item-avatar>
                  <v-icon v-if="project.metadata.name === projectName" color="teal">check</v-icon>
                </v-list-item-avatar>
                <v-list-item-content>
                  <v-list-item-title class="project-name">{{project.metadata.name}}</v-list-item-title>
                  <v-list-item-subtitle class="project-owner">{{getProjectOwner(project)}}</v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-list>
            <v-card-actions class="grey lighten-3">
              <v-tooltip top :disabled="canCreateProject" style="width: 100%">
                <v-btn
                  slot="activator"
                  text
                  block
                  class="project-add text-left teal--text"
                  :disabled="!canCreateProject"
                  @click.stop="openProjectDialog"
                >
                  <v-icon>add</v-icon>
                  <span class="ml-2">Create Project</span>
                </v-btn>
                <span>You are not authorized to create projects</span>
              </v-tooltip>
            </v-card-actions>
          </v-card>
        </v-menu>
      </template>
      <v-list ref="mainMenu">
        <v-list-item :to="{name: 'Home'}" exact v-if="hasNoProjects">
          <v-list-item-action>
            <v-icon class="white--text">mdi-home-outline</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title class="subtitle-1 ">Home</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <template v-if="namespace">
          <template v-for="(route, index) in routes">
            <v-list-item v-if="!route.meta.menu.hidden" :to="namespacedRoute(route)" :key="index">
              <v-list-item-action>
                <v-icon small class="white--text">{{route.meta.menu.icon}}</v-icon>
              </v-list-item-action>
              <v-list-item-content>
                <v-list-item-title class="subtitle-1 " >{{route.meta.menu.title}}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </template>
        </template>
      </v-list>

      <v-footer fixed>
        <img :src="footerLogoUrl" height="20px">
        <v-spacer></v-spacer>
        <div class="white--text">{{ copyright }}</div>
      </v-footer>

      <project-create-dialog v-model="projectDialog"></project-create-dialog>

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
import isEmpty from 'lodash/isEmpty'
import head from 'lodash/head'
import slice from 'lodash/slice'
import last from 'lodash/last'
import { emailToDisplayName, setDelayedInputFocus, routes, namespacedRoute, routeName } from '@/utils'
import ProjectCreateDialog from '@/components/dialogs/ProjectDialog'

const initialVisibleProjects = 10

export default {
  components: {
    ProjectCreateDialog
  },
  data () {
    return {
      version: process.env.VUE_APP_VERSION,
      copyright: `© ${new Date().getFullYear()}`,
      projectDialog: false,
      projectFilter: '',
      projectMenu: false,
      allProjectsItem: { metadata: { name: 'All Projects', namespace: '_all' } },
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
    footerLogoUrl () {
      return this.cfg.footerLogoUrl || '/static/sap-logo.svg'
    },
    isActive: {
      get () {
        return this.sidebar
      },
      set (val) {
        this.setSidebar(val)
      }
    },
    project: {
      get () {
        if (this.namespace === this.allProjectsItem.metadata.namespace) {
          return this.allProjectsItem
        }
        const predicate = item => item.metadata.namespace === this.namespace
        return find(this.projectList, predicate)
      },
      set ({ metadata = {} } = {}) {
        const namespace = metadata.namespace
        this.$router.push(this.getProjectMenuTargetRoute(namespace))
      }
    },
    routeMeta () {
      return this.$route.meta || {}
    },
    namespaced () {
      return !!this.routeMeta.namespaced
    },
    hasNoProjects () {
      return !this.projectList.length
    },
    routes () {
      const hasProjectScope = get(this.project, 'metadata.namespace') !== this.allProjectsItem.metadata.namespace
      return routes(this.$router, hasProjectScope)
    },
    projectMenuIcon () {
      return this.projectMenu ? 'mdi-chevron-up' : 'mdi-chevron-down'
    },
    projectName () {
      const project = this.project
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

      if (project !== this.project) {
        this.project = project
      }
    },
    openProjectDialog () {
      this.projectMenu = false
      this.projectDialog = true
    },
    getProjectMenuTargetRoute (namespace) {
      let name = routeName(this.$route)
      const nsHasProjectScope = namespace !== this.allProjectsItem.metadata.namespace
      const fallback = 'ShootList'
      if (!nsHasProjectScope) {
        const thisProjectScoped = this.routeMeta.projectScope
        if (thisProjectScoped) {
          name = fallback
        }
      } else if (!isEmpty(this.$route, 'params.name')) {
        name = fallback
      } else if (get(this.$route, 'name') === 'GardenTerminal') {
        name = fallback
      }
      return !this.namespaced ? { name, query: { namespace } } : { name, params: { namespace } }
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
      const projectListChildren = get(this, '$refs.projectList.$children')
      if (!projectListChildren) {
        return
      }
      const projectListItem = find(projectListChildren, child => {
        return get(child, '$attrs.data-g-project-name') === this.highlightedProjectName
      })
      if (!projectListItem) {
        return
      }

      const projectListElement = projectListItem.$el
      if (projectListElement) {
        projectListElement.scrollIntoView(false)
      }
    },
    handleProjectListScroll (event) {
      const projectListElement = this.$refs.projectList.$el
      if (!projectListElement) {
        return
      }
      const projectListBottomPosY = projectListElement.getBoundingClientRect().top + projectListElement.getBoundingClientRect().height
      const projectListChildren = get(this, '$refs.projectList.$children')
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
        background-color: #212121;
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
            color: rgb(0, 137, 123);
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
      background-color: rgba(0,0,0,0.1) !important;

      div {
        justify-content: left;
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
      .v-list-item--active {
        background: rgba(255,255,255,0.1) !important;
        color: white !important;
        .icon {
          color: white !important;
        }
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
          .v-list-item--highlighted {
            background-color: transparent !important
          }
        }
      }
    }
  }

</style>
