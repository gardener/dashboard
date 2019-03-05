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
          Project Members
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-text-field v-if="memberListWithoutOwner.length > 3"
          class="searchField"
          prepend-inner-icon="search"
          color="green darken-2"
          label="Search"
          solo
          clearable
          v-model="userFilter"
          @keyup.esc="userFilter=''"
        ></v-text-field>
        <v-btn icon @click.native.stop="openAddMemberDialog">
          <v-icon class="white--text">add</v-icon>
        </v-btn>
        <v-btn icon @click.native.stop="openMemberHelpDialog">
          <v-icon class="white--text">mdi-help-circle-outline</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text v-if="!memberListWithoutOwner.length">
        <div class="title grey--text text--darken-1 my-3">Add members to your project.</div>
        <p class="body-1">
          Adding members to your project allows you to collaborate across your team.
          Project members have full access to all resources within your project.
        </p>
      </v-card-text>
      <v-list two-line subheader v-else>
        <template v-for="(name, index) in sortedAndFilteredMemberList">
          <v-divider
            v-if="index > 0"
            inset
            :key="`${name}-dividerKey`"
          ></v-divider>
          <v-list-tile
            avatar
            :key="name"
          >
            <v-list-tile-avatar>
              <img :src="avatarUrl(name)" />
            </v-list-tile-avatar>
            <v-list-tile-content>
              <v-list-tile-title>
                {{displayName(name)}}
              </v-list-tile-title>
              <v-list-tile-sub-title>
                <a v-if="isEmail(name)" :href="`mailto:${name}`" class="cyan--text text--darken-2">{{name}}</a>
                <span v-else class="pl-2">{{name}}</span>
              </v-list-tile-sub-title>
            </v-list-tile-content>
            <v-list-tile-action>
              <v-tooltip top>
                <v-btn slot="activator" icon class="red--text" @click.native.stop="onDelete(name)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
                <span>Delete Member</span>
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
          v-model="serviceFilter"
          @keyup.esc="serviceFilter=''"
        ></v-text-field>
        <v-btn icon @click.native.stop="openAddserviceAccountDialog">
          <v-icon class="white--text">add</v-icon>
        </v-btn>
        <v-btn icon @click.native.stop="openserviceAccountHelpDialog">
          <v-icon class="white--text">mdi-help-circle-outline</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text v-if="!serviceAccountList.length">
        <div class="title grey--text text--darken-1 my-3">Add service accounts to your project.</div>
        <p class="body-1">
          Adding service accounts to your project allows you to automate processes in your project.
          Service accounts have full access to all resources within your project.
        </p>
      </v-card-text>
      <v-list two-line subheader v-else>
        <template v-for="(name, index) in sortedAndFilteredserviceAccountList">
          <v-divider
            v-if="index > 0"
            inset
            :key="`${name}-dividerKey`"
          ></v-divider>
          <v-list-tile
            avatar
            :key="name"
          >

            <v-list-tile-avatar>
              <img :src="avatarUrl(name)" />
            </v-list-tile-avatar>
            <v-list-tile-content>
              <v-list-tile-title>
                {{name.replace(/^system:serviceaccount:[^:]+:/, '').toUpperCase()}}
              </v-list-tile-title>
              <v-list-tile-sub-title>
                {{name}}
              </v-list-tile-sub-title>
            </v-list-tile-content>
            <v-list-tile-action>
              <v-tooltip top>
                <v-btn slot="activator" icon class="blue-grey--text" @click.native.stop="onDownload(name)">
                  <v-icon>mdi-download</v-icon>
                </v-btn>
                <span>Download Kubeconfig</span>
              </v-tooltip>
            </v-list-tile-action>
            <v-list-tile-action>
              <v-tooltip top>
                <v-btn slot="activator" small icon class="blue-grey--text" @click="onKubeconfig(name)">
                  <v-icon>visibility</v-icon>
                </v-btn>
                <span>Show Kubeconfig</span>
              </v-tooltip>
            </v-list-tile-action>
            <v-list-tile-action>
              <v-tooltip top>
                <v-btn slot="activator" icon class="red--text" @click.native.stop="onDelete(name)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
                <span>Delete Service Account</span>
              </v-tooltip>
            </v-list-tile-action>
          </v-list-tile>
        </template>
      </v-list>
    </v-card>

    <member-add-dialog type="user" v-model="memberAddDialog"></member-add-dialog>
    <member-add-dialog type="service" v-model="serviceAccountAddDialog"></member-add-dialog>
    <member-help-dialog type="user" v-model="memberHelpDialog"></member-help-dialog>
    <member-help-dialog type="service" v-model="serviceAccountHelpDialog"></member-help-dialog>
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
        <v-btn fab small color="grey lighten-2" light @click="openAddserviceAccountDialog">
          <v-icon color="blue-grey darken-2">mdi-monitor</v-icon>
        </v-btn>
        <v-btn fab small color="grey lighten-2" @click="openAddMemberDialog">
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
import startsWith from 'lodash/startsWith'
import find from 'lodash/find'
import download from 'downloadjs'
import filter from 'lodash/filter'
import MemberAddDialog from '@/dialogs/MemberAddDialog'
import MemberHelpDialog from '@/dialogs/MemberHelpDialog'
import { mapState, mapActions, mapGetters } from 'vuex'
import {
  emailToDisplayName,
  gravatarUrlGeneric,
  isEmail,
  serviceAccountToDisplayName
} from '@/utils'
import { getMember } from '@/utils/api'
import CodeBlock from '@/components/CodeBlock'

export default {
  name: 'members',
  components: {
    MemberAddDialog,
    MemberHelpDialog,
    CodeBlock
  },
  data () {
    return {
      memberAddDialog: false,
      serviceAccountAddDialog: false,
      memberHelpDialog: false,
      serviceAccountHelpDialog: false,
      kubeconfigDialog: false,
      userFilter: '',
      serviceFilter: '',
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
      'memberList',
      'projectList'
    ]),
    helpDialogType () {
      if (this.memberHelpDialog) {
        return 'user'
      }
      if (this.serviceAccountHelpDialog) {
        return 'service'
      }
      return undefined
    },
    addDialogType () {
      if (this.memberAddDialog) {
        return 'user'
      }
      if (this.serviceAccountAddDialog) {
        return 'service'
      }
      return undefined
    },
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
      const predicate = username => startsWith(username, `system:serviceaccount:${this.namespace}:`)
      return filter(this.memberList, predicate)
    },
    memberListWithoutOwner () {
      const predicate = username => !this.isOwner(username) && !startsWith(username, 'system:serviceaccount:')
      return filter(this.memberList, predicate)
    },
    sortedAndFilteredMemberList () {
      const predicate = value => {
        if (!this.userFilter) {
          return true
        }
        const name = replace(value, /@.*$/, '')
        return includes(toLower(name), toLower(this.userFilter))
      }
      return sortBy(filter(this.memberListWithoutOwner, predicate))
    },
    sortedAndFilteredserviceAccountList () {
      const predicate = service => {
        if (!this.serviceFilter) {
          return true
        }
        const name = serviceAccountToDisplayName(service)
        return includes(toLower(name), toLower(this.serviceFilter))
      }
      return sortBy(filter(this.serviceAccountList, predicate))
    },
    currentServiceAccountDisplayName () {
      return serviceAccountToDisplayName(this.currentServiceAccountName)
    }
  },
  methods: {
    ...mapActions([
      'addMember',
      'deleteMember',
      'setError'
    ]),
    openAddMemberDialog () {
      this.memberAddDialog = true
    },
    openAddserviceAccountDialog () {
      this.serviceAccountAddDialog = true
    },
    openMemberHelpDialog () {
      this.memberHelpDialog = true
    },
    openserviceAccountHelpDialog () {
      this.serviceAccountHelpDialog = true
    },
    displayName (username) {
      return emailToDisplayName(username)
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
        const { data } = await getMember({ namespace, name, user })
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
      this.deleteMember(username)
    }
  },
  mounted () {
    this.floatingButton = true
  },
  created () {
    this.$bus.$on('esc-pressed', () => {
      this.memberAddDialog = false
      this.memberHelpDialog = false
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
