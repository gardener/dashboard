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
  <v-container fluid>
    <v-card class="mr-extra">
      <v-toolbar card color="teal darken-2">
        <v-icon class="white--text pr-2">mdi-account</v-icon>
        <v-toolbar-title class="subheading white--text">
          Main Contact
        </v-toolbar-title>
      </v-toolbar>
      <v-list v-if="!!owner" two-line subheader>
        <v-list-tile avatar>
          <v-list-tile-avatar>
            <img :src="avatarUrl(owner)" />
          </v-list-tile-avatar>
          <v-list-tile-content>
            <v-list-tile-title>{{displayName(owner)}}</v-list-tile-title>
            <v-list-tile-sub-title><a :href="'mailto:'+owner" class="cyan--text text--darken-2">{{owner}}</a></v-list-tile-sub-title>
          </v-list-tile-content>
        </v-list-tile>
      </v-list>
      <v-list v-else two-line subheader>
        <v-list-tile avatar>
          <v-list-tile-content>
            <v-list-tile-title>This project has no main contact configured.</v-list-tile-title>
            <v-list-tile-sub-title>You can set a main contact on the <router-link :to="{ name: 'Administration', params: { namespace:project.metadata.namespace } }">administration</router-link> page by selecting one of the members from the list below.</v-list-tile-sub-title>
          </v-list-tile-content>
        </v-list-tile>
      </v-list>
    </v-card>

    <v-card class="mr-extra mt-4">
      <v-toolbar card color="green darken-2">
        <v-icon class="white--text pr-2">mdi-account-multiple</v-icon>
        <v-toolbar-title class="subheading white--text">
          Project Viewers
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-text-field v-if="viewerListWithoutOwner.length > 3"
          class="searchField"
          prepend-inner-icon="search"
          color="green darken-2"
          label="Search"
          solo
          clearable
          v-model="userFilter"
          @keyup.esc="userFilter=''"
        ></v-text-field>
        <v-btn v-if="allEmails" icon :href="`mailto:${allEmails}`">
          <v-icon class="white--text">mdi-email-outline</v-icon>
        </v-btn>
        <v-btn icon @click.native.stop="openViewerAddDialog">
          <v-icon class="white--text">add</v-icon>
        </v-btn>
        <v-btn icon @click.native.stop="openViewerHelpDialog">
          <v-icon class="white--text">mdi-help-circle-outline</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text v-if="!viewerListWithoutOwner.length">
        <div class="title grey--text text--darken-1 my-3">Add viewers to your project.</div>
        <p class="body-1">
          Adding viewers to your project allows you to collaborate across your team.
          Project viewers have read-only access to all resources within your project and no access to secrets.
        </p>
      </v-card-text>
      <v-list two-line subheader v-else>
        <template v-for="({ username }, index) in sortedAndFilteredViewerList">
          <v-divider
            v-if="index > 0"
            inset
            :key="`${username}-dividerKey`"
          ></v-divider>
          <v-list-tile
            avatar
            :key="username"
          >
            <v-list-tile-avatar>
              <img :src="avatarUrl(username)" />
            </v-list-tile-avatar>
            <v-list-tile-content>
              <v-list-tile-title>
                {{displayName(username)}}
              </v-list-tile-title>
              <v-list-tile-sub-title>
                <a v-if="isEmail(username)" :href="`mailto:${username}`" class="cyan--text text--darken-2">{{username}}</a>
                <span v-else class="pl-2">{{username}}</span>
              </v-list-tile-sub-title>
            </v-list-tile-content>
            <v-list-tile-action>
              <v-tooltip top>
                <v-btn slot="activator" icon class="red--text" @click.native.stop="onDelete(username)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
                <span>Delete Viewer</span>
              </v-tooltip>
            </v-list-tile-action>
          </v-list-tile>
        </template>
      </v-list>
    </v-card>

    <v-card class="mr-extra mt-4">
      <v-toolbar card color="blue-grey">
        <v-icon class="white--text pr-2">mdi-monitor-multiple</v-icon>
        <v-toolbar-title class="subheading white--text">
          Service Accounts
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-text-field v-if="serviceAccountList.length > 3"
          class="searchField"
          prepend-inner-icon="search"
          color="green darken-2"
          label="Search"
          solo
          clearable
          v-model="serviceAccountFilter"
          @keyup.esc="serviceAccountFilter=''"
        ></v-text-field>
        <v-btn icon @click.native.stop="openServiceAccountAddDialog">
          <v-icon class="white--text">add</v-icon>
        </v-btn>
        <v-btn icon @click.native.stop="openServiceAccountHelpDialog">
          <v-icon class="white--text">mdi-help-circle-outline</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text v-if="!serviceAccountList.length">
        <div class="title grey--text text--darken-1 my-3">Add service accounts to your project.</div>
        <p class="body-1">
          Adding service accounts with viewer role to your project allows you to automate processes in your project.
          Service accounts have read-only access to all resources within your project and no access to secrets.
        </p>
      </v-card-text>
      <v-list two-line subheader v-else>
        <viewer-service-accounts-row
          v-for="(viewer, index) in sortedAndFilteredServiceAccountList"
          :viewer="viewer"
          :firstRow="index === 0"
          :key="viewer.username"
          @onDownload="onDownload"
          @onKubeconfig="onKubeconfig"
          @onDelete="onDelete"
        ></viewer-service-accounts-row>
      </v-list>
    </v-card>

    <viewer-add-dialog type="user" v-model="viewerAddDialog"></viewer-add-dialog>
    <viewer-add-dialog type="service" v-model="serviceAccountAddDialog"></viewer-add-dialog>
    <viewer-help-dialog type="user" v-model="viewerHelpDialog"></viewer-help-dialog>
    <viewer-help-dialog type="service" v-model="serviceAccountHelpDialog"></viewer-help-dialog>
    <v-dialog v-model="kubeconfigDialog" persistent max-width="67%">
      <v-card>
        <v-card-title class="teal darken-2 grey--text text--lighten-4">
          <div class="headline">Kubeconfig <code class="serviceAccount_name">{{currentServiceAccountDisplayName}}</code></div>
          <v-spacer></v-spacer>
          <v-btn icon class="grey--text text--lighten-4" @click.native="kubeconfigDialog = false">
            <v-icon>close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <code-block lang="yaml" :content="currentServiceAccountKubeconfig"></code-block>
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-fab-transition>
      <v-speed-dial v-model="fab" v-show="floatingButton" fixed bottom right direction="top" transition="slide-y-reverse-transition"  >
        <v-btn slot="activator" v-model="fab" color="teal darken-2" dark fab>
          <v-icon>add</v-icon>
          <v-icon>close</v-icon>
        </v-btn>
        <v-btn fab small color="grey lighten-2" light @click="openServiceAccountAddDialog">
          <v-icon color="blue-grey darken-2">mdi-monitor</v-icon>
        </v-btn>
        <v-btn fab small color="grey lighten-2" @click="openViewerAddDialog">
          <v-icon color="green darken-2">person</v-icon>
        </v-btn>
      </v-speed-dial>
    </v-fab-transition>
  </v-container>
</template>

<script>
import includes from 'lodash/includes'
import toLower from 'lodash/toLower'
import replace from 'lodash/replace'
import sortBy from 'lodash/sortBy'
import find from 'lodash/find'
import download from 'downloadjs'
import filter from 'lodash/filter'
import forEach from 'lodash/forEach'
import join from 'lodash/join'
import ViewerAddDialog from '@/dialogs/ViewerAddDialog'
import ViewerHelpDialog from '@/dialogs/ViewerHelpDialog'
import CodeBlock from '@/components/CodeBlock'
import ViewerServiceAccountsRow from '@/components/ViewerServiceAccountsRow'
import { mapState, mapActions, mapGetters } from 'vuex'
import {
  displayName,
  gravatarUrlGeneric,
  isEmail,
  serviceAccountToDisplayName,
  isServiceAccount
} from '@/utils'
import { getViewer } from '@/utils/api'

export default {
  name: 'viewers',
  components: {
    ViewerAddDialog,
    ViewerHelpDialog,
    CodeBlock,
    ViewerServiceAccountsRow
  },
  data () {
    return {
      viewerAddDialog: false,
      serviceAccountAddDialog: false,
      viewerHelpDialog: false,
      serviceAccountHelpDialog: false,
      kubeconfigDialog: false,
      userFilter: '',
      serviceAccountFilter: '',
      fab: false,
      floatingButton: false,
      currentServiceAccountName: undefined,
      currentServiceAccountKubeconfig: undefined
    }
  },
  computed: {
    ...mapState([
      'user',
      'namespace'
    ]),
    ...mapGetters([
      'viewerList',
      'projectList'
    ]),
    project () {
      const predicate = project => project.metadata.namespace === this.namespace
      return find(this.projectList, predicate)
    },
    projectData () {
      return this.project.data || {}
    },
    owner () {
      return toLower(this.projectData.owner)
    },
    serviceAccountList () {
      return filter(this.viewerList, ({ username }) => isServiceAccount(username))
    },
    viewerListWithoutOwner () {
      const predicate = ({ username }) => !this.isOwner(username) && !isServiceAccount(username)
      return filter(this.viewerList, predicate)
    },
    sortedAndFilteredViewerList () {
      const predicate = ({ username }) => {
        if (!this.userFilter) {
          return true
        }
        const name = replace(username, /@.*$/, '')
        return includes(toLower(name), toLower(this.userFilter))
      }
      return sortBy(filter(this.viewerListWithoutOwner, predicate))
    },
    allEmails () {
      const emails = []
      forEach(this.viewerList, ({ username }) => {
        if (!isEmail(username)) {
          return false
        }
        emails.push(username)
      })
      return join(emails, ';')
    },
    sortedAndFilteredServiceAccountList () {
      const predicate = ({ username }) => {
        if (!this.serviceAccountFilter) {
          return true
        }
        const name = serviceAccountToDisplayName(username)
        return includes(toLower(name), toLower(this.serviceAccountFilter))
      }
      return sortBy(filter(this.serviceAccountList, predicate))
    },
    currentServiceAccountDisplayName () {
      return serviceAccountToDisplayName(this.currentServiceAccountName)
    }
  },
  methods: {
    ...mapActions([
      'addViewer',
      'deleteViewer',
      'setError'
    ]),
    openViewerAddDialog () {
      this.viewerAddDialog = true
    },
    openViewerHelpDialog () {
      this.viewerHelpDialog = true
    },
    openServiceAccountAddDialog () {
      this.serviceAccountAddDialog = true
    },
    openServiceAccountHelpDialog () {
      this.serviceAccountHelpDialog = true
    },
    displayName (username) {
      return displayName(username)
    },
    isOwner (username) {
      return this.owner === toLower(username)
    },
    isEmail (username) {
      return isEmail(username)
    },
    avatarUrl (username) {
      return gravatarUrlGeneric(username)
    },
    async downloadKubeconfig (name) {
      const namespace = this.namespace
      const user = this.user
      try {
        const { data } = await getViewer({ namespace, name, user }) // This action should be deactivated for users with viewer role
        if (!data.kubeconfig) {
          this.setError({ message: 'Failed to fetch Kubeconfig' })
        } else {
          return data.kubeconfig
        }
      } catch (err) {
        this.setError(err)
      }
    },
    async onDownload (name) {
      const kubeconfig = await this.downloadKubeconfig(name)
      if (kubeconfig) {
        download(kubeconfig, 'kubeconfig.yaml', 'text/yaml')
      }
    },
    async onKubeconfig (name) {
      const kubeconfig = await this.downloadKubeconfig(name)
      if (kubeconfig) {
        this.currentServiceAccountName = name
        this.currentServiceAccountKubeconfig = kubeconfig
        this.kubeconfigDialog = true
      }
    },
    onDelete (username) {
      this.deleteViewer(username)
    }
  },
  mounted () {
    this.floatingButton = true
  },
  created () {
    this.$bus.$on('esc-pressed', () => {
      this.viewerAddDialog = false
      this.viewerHelpDialog = false
      this.serviceAccountAddDialog = false
      this.serviceAccountHelpDialog = false
      this.kubeconfigDialog = false
      this.fab = false
    })
  }
}
</script>

<style lang="styl" scoped>

  .searchField {
    margin-right: 20px !important;
  }

  >>> .v-input__slot {
    margin: 0px;
  }

  .serviceAccount_name {
    color: rgb(0, 137, 123);
  }
</style>
