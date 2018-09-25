<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
          <v-btn @click.native.stop="setSidebar(!isActive)" icon class="right white--text">
            <v-icon>mdi-chevron-double-left</v-icon>
          </v-btn>
          <a href="/">
            <img src="../assets/logo.svg" class="logo">
            <h1 class="white--text">Gardener <span class="version">{{version}}</span></h1>
            <h2>The Kubernetes Botanist</h2>
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
        full-width
        allow-overflow
        open-on-click
        :close-on-content-click="false"
        content-class="project-menu"
        v-model="projectMenu"
      >
        <v-btn block slot="activator" class="project-selector elevation-4 ma-0 white--text">
          <v-icon class="pr-4">mdi-grid-large</v-icon>
          <span class="ml-2">{{projectName}}</span>
          <v-spacer></v-spacer>
          <v-icon right>{{projectMenuIcon}}</v-icon>
        </v-btn>

        <v-card light>
          <template v-if="projectList.length > 3">
            <v-card-title class="pa-0 grey lighten-5">
              <v-text-field
                light
                clearable
                label="Filter projects"
                single-line
                hide-details
                full-width
                color="grey darken-1"
                prepend-icon="search"
                class="ml-3 py-2 project-filter"
                v-model="projectFilter"
                ref="projectFilter"
                @keyup.esc="projectFilter = ''"
                autofocus
              >
              </v-text-field>
            </v-card-title>
            <v-divider></v-divider>
          </template>
          <v-list light class="project-list">
            <v-list-tile
              v-for="project in sortedAndFilteredProjectList"
              :key="project.metadata.name"
              @click="onProjectSelect(project)"
            >
              <v-list-tile-avatar>
                <v-icon v-if="project.metadata.name===projectName" color="teal">check</v-icon>
              </v-list-tile-avatar>
              <v-list-tile-content>
                <v-list-tile-title>{{project.metadata.name}}</v-list-tile-title>
                <v-list-tile-sub-title class="project-owner">{{getProjectOwner(project)}}</v-list-tile-sub-title>
              </v-list-tile-content>
            </v-list-tile>
          </v-list>
          <v-card-actions class="grey lighten-3">
            <v-btn flat block class="project-add text-xs-left teal--text" @click.stop="openProjectDialog">
              <v-icon>add</v-icon>
              <span class="ml-2">Create new Project</span>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-menu>
      </template>
      <v-list>
        <v-list-tile :to="{name: 'Home'}" exact v-if="hasNoProjects">
          <v-list-tile-action>
            <v-icon class="white--text">mdi-home-outline</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title class="subheading">Home</v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
        <template v-for="route in routes" v-if="namespace">
          <v-list-tile :to="namespacedRoute(route)">
            <v-list-tile-action>
              <v-icon small class="white--text">{{route.meta.menu.icon}}</v-icon>
            </v-list-tile-action>
            <v-list-tile-content>
              <v-list-tile-title class="subheading" >{{route.meta.menu.title}}</v-list-tile-title>
            </v-list-tile-content>
          </v-list-tile>
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
  /* global VERSION */
  import { mapState, mapGetters, mapActions } from 'vuex'
  import find from 'lodash/find'
  import filter from 'lodash/filter'
  import sortBy from 'lodash/sortBy'
  import toLower from 'lodash/toLower'
  import includes from 'lodash/includes'
  import replace from 'lodash/replace'
  import get from 'lodash/get'
  import { emailToDisplayName, setDelayedInputFocus, routes, namespacedRoute, routeName } from '@/utils'
  import ProjectCreateDialog from '@/dialogs/ProjectDialog'

  export default {
    components: {
      ProjectCreateDialog
    },
    data () {
      return {
        version: VERSION,
        copyright: `© ${new Date().getFullYear()}`,
        projectDialog: false,
        projectFilter: '',
        projectMenu: false,
        allProjectsItem: {metadata: {name: 'All Projects', namespace: '_all'}}
      }
    },
    computed: {
      ...mapState([
        'namespace',
        'sidebar',
        'cfg'
      ]),
      ...mapGetters([
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
        set ({metadata = {}} = {}) {
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
        const sortedList = sortBy(filter(this.projectList, predicate))
        if (sortedList.length > 1) {
          sortedList.unshift(this.allProjectsItem)
        }
        return sortedList
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
      }
    },
    methods: {
      ...mapActions([
        'setSidebar'
      ]),
      onProjectSelect (project) {
        this.projectMenu = false
        this.project = project
      },
      openProjectDialog () {
        this.projectMenu = false
        this.projectDialog = true
      },
      getProjectMenuTargetRoute (namespace) {
        let name = routeName(this.$route)
        const nsHasProjectScope = namespace !== this.allProjectsItem.metadata.namespace
        if (!nsHasProjectScope) {
          const thisProjectScoped = this.routeMeta.projectScope
          if (thisProjectScoped) {
            name = 'ShootList'
          }
        }
        return !this.namespaced ? {name, query: {namespace}} : {name, params: {namespace}}
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

<style lang="styl">
  .project-menu {
    border-radius: 0;

    .card {
      border-radius: 0;

      .project-filter {
        label {
          top: 10px;
        }
      }

      .project-add > div {
        justify-content: left;
      }

      .project-list {
        height: auto;
        max-height: (4 * 54px) + (2 * 8px);
        overflow-y: auto;

        div > a {
          height: 54px;
        }
        .project-owner {
          font-size: 11px;
        }
      }
    }
  }
</style>

<style lang="styl" scoped>
  teaserHeight = 200px

  aside {
    overflow: hidden

    .teaser {
      height: teaserHeight
      overflow: hidden

      .content {
        display: block;
        position: relative;
        height: teaserHeight
        overflow: hidden
        background-color: #212121
        text-align: center

        a {
          text-decoration: none

          .logo {
            height: 80px
            pointer-events: none
            margin: 21px 0 0 0
            transform: translateX(30%)
          }

          h1 {
            font-size: 40px
            line-height: 40px
            padding: 10px 0 0 0
            margin: 0
            letter-spacing: 4px
            font-weight: 100
            position: relative

            .version {
              font-size: 10px
              line-height: 10px
              letter-spacing: 3px
              position: absolute
              top: 6px
              right: 20px
            }
          }

          h2 {
            color: rgb(0, 137, 123)
            font-size: 15px
            font-weight: 300
            padding: 0px
            margin: 0px
            letter-spacing: 0.8px
          }
        }


      }
    }

    .project-selector {
      height: 60px
      font-weight: 700
      font-size: 16px
      background-color: rgba(0,0,0,0.1) !important

      >>> div {
        justify-content: left
      }
    }

    .footer{
      background-color: transparent
      bottom: 10px
      padding-left: 10px;
      padding-right: 10px;
    }

    >>> .list {
      .list__tile__title {
          text-transform: uppercase
          font-size: 13px;
          max-width: 180px;
      }
      .list__tile--active {
        background: rgba(255,255,255,0.1) !important
        color: white !important
        .icon {
          color: white !important
        }
      }
    }
  }

</style>
