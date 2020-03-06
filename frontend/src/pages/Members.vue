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
          Technical Contact
        </v-toolbar-title>
      </v-toolbar>
      <v-list v-if="!!technicalContact" two-line subheader>
        <v-list-tile avatar>
          <v-list-tile-avatar>
            <img :src="avatarUrl(technicalContact)" />
          </v-list-tile-avatar>
          <v-list-tile-content>
            <v-list-tile-title>{{displayName(technicalContact)}}</v-list-tile-title>
            <v-list-tile-sub-title><a :href="'mailto:'+technicalContact" class="cyan--text text--darken-2">{{technicalContact}}</a></v-list-tile-sub-title>
          </v-list-tile-content>
        </v-list-tile>
      </v-list>
      <v-list v-else two-line subheader>
        <v-list-tile avatar>
          <v-list-tile-content>
            <v-list-tile-title>This project has no technical contact configured.</v-list-tile-title>
            <v-list-tile-sub-title>You can set a technical contact on the <router-link :to="{ name: 'Administration', params: { namespace:project.metadata.namespace } }">administration</router-link> page by selecting one of the users from the list below.</v-list-tile-sub-title>
          </v-list-tile-content>
        </v-list-tile>
      </v-list>
    </v-card>

    <v-card class="mr-extra mt-4">
      <v-toolbar card color="green darken-2">
        <v-icon class="white--text pr-2">mdi-account-multiple</v-icon>
        <v-toolbar-title class="subheading white--text">
          Project Users
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-text-field v-if="userList.length > 3"
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
        <v-btn v-if="canPatchProject" icon @click.native.stop="openUserAddDialog">
          <v-icon class="white--text">add</v-icon>
        </v-btn>
        <v-btn icon @click.native.stop="openUserHelpDialog">
          <v-icon class="white--text">mdi-help-circle-outline</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text v-if="!userList.length">
        <div class="title grey--text text--darken-1 my-3">Add users to your project.</div>
        <p class="body-1">
          Adding users to your project allows you to collaborate across your team.
          Project users have full access to all resources within your project.
        </p>
      </v-card-text>
      <v-list two-line subheader v-else>
        <template v-for="(user, index) in sortedAndFilteredUserList">
          <v-divider v-if="index !== 0" inset :key="index"></v-divider>
          <project-user-row
            :username="user.username"
            :avatarUrl="user.avatarUrl"
            :displayName="user.displayName"
            :isEmail="user.isEmail"
            :isTechnicalContact="user.isTechnicalContact"
            :key="user.username"
            @onDelete="onDelete"
          ></project-user-row>
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
        <v-btn v-if="canPatchProject" icon @click.native.stop="openServiceAccountAddDialog">
          <v-icon class="white--text">add</v-icon>
        </v-btn>
        <v-btn icon @click.native.stop="openServiceAccountHelpDialog">
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
        <template v-for="(serviceAccount, index) in sortedAndFilteredServiceAccountList">
          <v-divider v-if="index !== 0" inset :key="index"></v-divider>
          <project-service-account-row
            :username="serviceAccount.username"
            :avatarUrl="serviceAccount.avatarUrl"
            :displayName="serviceAccount.displayName"
            :createdBy="serviceAccount.createdBy"
            :creationTimestamp="serviceAccount.creationTimestamp"
            :created="serviceAccount.created"
            :key="serviceAccount.username"
            @onDownload="onDownload"
            @onKubeconfig="onKubeconfig"
            @onDelete="onDelete"
          ></project-service-account-row>
        </template>
      </v-list>
    </v-card>

    <member-dialog type="adduser" v-model="userAddDialog"></member-dialog>
    <member-dialog type="addservice" v-model="serviceAccountAddDialog"></member-dialog>
    <member-dialog type="updateuser" :oldName="updateMemberName" :userroles="updateUserRoles" v-model="userUpdateDialog"></member-dialog>
    <member-dialog type="updateservice" :oldName="updateMemberName" :userroles="updateUserRoles" v-model="serviceAccountUpdateDialog"></member-dialog>
    <member-help-dialog type="user" v-model="userHelpDialog"></member-help-dialog>
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
    <v-fab-transition v-if="canPatchProject">
      <v-speed-dial v-model="fab" v-show="floatingButton" fixed bottom right direction="top" transition="slide-y-reverse-transition"  >
        <v-btn slot="activator" v-model="fab" color="teal darken-2" dark fab>
          <v-icon>add</v-icon>
          <v-icon>close</v-icon>
        </v-btn>
        <v-btn fab small color="grey lighten-2" light @click="openServiceAccountAddDialog">
          <v-icon color="blue-grey darken-2">mdi-monitor</v-icon>
        </v-btn>
        <v-btn fab small color="grey lighten-2" @click="openUserAddDialog">
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
import download from 'downloadjs'
import filter from 'lodash/filter'
import forEach from 'lodash/forEach'
import join from 'lodash/join'
import map from 'lodash/map'
import MemberDialog from '@/dialogs/MemberDialog'
import MemberHelpDialog from '@/dialogs/MemberHelpDialog'
import CodeBlock from '@/components/CodeBlock'
import ProjectUserRow from '@/components/ProjectUserRow'
import ProjectServiceAccountRow from '@/components/ProjectServiceAccountRow'
import { mapState, mapActions, mapGetters } from 'vuex'
import {
  displayName,
  gravatarUrlGeneric,
  isEmail,
  serviceAccountToDisplayName,
  isServiceAccount,
  getTimestampFormatted
} from '@/utils'
import { getMember } from '@/utils/api'
import { getProjectDetails } from '@/utils/projects'

export default {
  name: 'members',
  components: {
    MemberDialog,
    MemberHelpDialog,
    CodeBlock,
    ProjectUserRow,
    ProjectServiceAccountRow
  },
  data () {
    return {
      userAddDialog: false,
      serviceAccountAddDialog: false,
      userUpdateDialog: false,
      serviceAccountUpdateDialog: false,
      userHelpDialog: false,
      serviceAccountHelpDialog: false,
      kubeconfigDialog: false,
      updateMemberName: undefined,
      updateUserRoles: undefined,
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
      'memberList',
      'projectFromProjectList',
      'canPatchProject'
    ]),
    project () {
      return this.projectFromProjectList
    },
    projectDetails () {
      return getProjectDetails(this.project)
    },
    technicalContact () {
      return this.projectDetails.technicalContact
    },
    costObject () {
      return this.projectDetails.costObject
    },
    serviceAccountList () {
      const serviceAccounts = filter(this.memberList, ({ username }) => isServiceAccount(username))
      return map(serviceAccounts, serviceAccount => {
        const { username } = serviceAccount
        return {
          ...serviceAccount,
          avatarUrl: gravatarUrlGeneric(username),
          displayName: displayName(username),
          created: getTimestampFormatted(serviceAccount.creationTimestamp),
          roleNames: map(serviceAccount.roles, this.roleName)
        }
      })
    },
    userList () {
      const users = filter(this.memberList, ({ username }) => !isServiceAccount(username))
      return map(users, user => {
        const { username } = user
        return {
          ...user,
          avatarUrl: gravatarUrlGeneric(username),
          displayName: displayName(username),
          isEmail: isEmail(username),
          isTechnicalContact: this.isTechnicalContact(username),
          roleNames: map(user.roles, this.roleName)
        }
      })
    },
    sortedAndFilteredUserList () {
      const predicate = ({ username }) => {
        if (isServiceAccount(username)) {
          return false
        }

        if (!this.userFilter) {
          return true
        }
        const name = replace(username, /@.*$/, '')
        return includes(toLower(name), toLower(this.userFilter))
      }
      return sortBy(filter(this.userList, predicate), 'displayName')
    },
    allEmails () {
      const emails = []
      forEach(this.userList, ({ username }) => {
        if (isEmail(username)) {
          emails.push(username)
        }
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
      return sortBy(filter(this.serviceAccountList, predicate), 'displayName')
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
    openUserAddDialog () {
      this.userAddDialog = true
    },
    openUserUpdateDialog () {
      this.userUpdateDialog = true
    },
    openUserHelpDialog () {
      this.userHelpDialog = true
    },
    openServiceAccountAddDialog () {
      this.serviceAccountAddDialog = true
    },
    openServiceAccountUpdateDialog () {
      this.serviceAccountUpdateDialog = true
    },
    openServiceAccountHelpDialog () {
      this.serviceAccountHelpDialog = true
    },
    isTechnicalContact (username) {
      return this.technicalContact === toLower(username)
    },
    avatarUrl (username) {
      return gravatarUrlGeneric(username)
    },
    displayName (username) {
      return displayName(username)
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
      this.userAddDialog = false
      this.userHelpDialog = false
      this.userUpdateDialog = false
      this.serviceAccountAddDialog = false
      this.serviceAccountHelpDialog = false
      this.serviceAccountUpdateDialog = false
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
