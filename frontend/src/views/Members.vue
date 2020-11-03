<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-container fluid>
    <v-card class="mr-extra mt-6">
      <v-toolbar flat color="green darken-2">
        <v-icon class="white--text pr-2">mdi-account-multiple</v-icon>
        <v-toolbar-title class="subtitle-1 white--text">
          Project Users
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-text-field v-if="userList.length > 3"
          class="searchField"
          prepend-inner-icon="mdi-magnify"
          color="green darken-2"
          label="Search"
          hide-details
          flat
          solo
          clearable
          v-model="userFilter"
          @keyup.esc="userFilter=''"
        ></v-text-field>
        <v-btn v-if="allEmails" icon :href="`mailto:${allEmails}`">
          <v-icon class="white--text">mdi-email-outline</v-icon>
        </v-btn>
        <v-btn v-if="canManageMembers" icon @click.native.stop="openUserAddDialog">
          <v-icon class="white--text">mdi-plus</v-icon>
        </v-btn>
        <v-btn icon @click.native.stop="openUserHelpDialog">
          <v-icon class="white--text">mdi-help-circle-outline</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text v-if="!userList.length">
        <div class="title grey--text text--darken-1 my-4">Add users to your project.</div>
        <p class="body-1">
          Adding users to your project allows you to collaborate across your team.
          Access to resources within your project can be configured by assigning roles.
        </p>
      </v-card-text>
      <v-list two-line subheader v-else>
        <template v-for="(user, index) in sortedAndFilteredUserList">
          <v-divider v-if="index !== 0" inset :key="index"></v-divider>
          <project-user-row
            :username="user.username"
            :isCurrentUser="user.isCurrentUser"
            :avatarUrl="user.avatarUrl"
            :displayName="user.displayName"
            :isEmail="user.isEmail"
            :isOwner="user.isOwner"
            :roles="user.roles"
            :roleDisplayNames="user.roleDisplayNames"
            :key="user.username"
            @delete="onRemoveUser"
            @edit="onEditUser"
          ></project-user-row>
        </template>
      </v-list>
    </v-card>

    <v-card class="mr-extra mt-6">
      <v-toolbar flat color="blue-grey">
        <v-icon class="white--text pr-2">mdi-monitor-multiple</v-icon>
        <v-toolbar-title class="subtitle-1 white--text">
          Service Accounts
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-text-field v-if="serviceAccountList.length > 3"
          class="searchField"
          prepend-inner-icon="mdi-magnify"
          color="blue-grey"
          label="Search"
          hide-details
          flat
          solo
          clearable
          v-model="serviceAccountFilter"
          @keyup.esc="serviceAccountFilter=''"
        ></v-text-field>
        <v-btn v-if="canManageServiceAccountMembers" icon @click.native.stop="openServiceAccountAddDialog">
          <v-icon class="white--text">mdi-plus</v-icon>
        </v-btn>
        <v-btn icon @click.native.stop="openServiceAccountHelpDialog">
          <v-icon class="white--text">mdi-help-circle-outline</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text v-if="!serviceAccountList.length">
        <div class="title grey--text text--darken-1 my-4">Add service accounts to your project.</div>
        <p class="body-1">
          Adding service accounts to your project allows you to automate processes in your project.
          Access to resources within your project can be configured by assigning roles.
        </p>
      </v-card-text>
      <v-list two-line subheader v-else>
        <template v-for="(serviceAccount, index) in sortedAndFilteredServiceAccountList">
          <v-divider v-if="index !== 0" inset :key="index"></v-divider>
          <project-service-account-row
            :username="serviceAccount.username"
            :isCurrentUser="serviceAccount.isCurrentUser"
            :avatarUrl="serviceAccount.avatarUrl"
            :displayName="serviceAccount.displayName"
            :createdBy="serviceAccount.createdBy"
            :creationTimestamp="serviceAccount.creationTimestamp"
            :created="serviceAccount.created"
            :description="serviceAccount.description"
            :roles="serviceAccount.roles"
            :roleDisplayNames="serviceAccount.roleDisplayNames"
            :key="`${serviceAccount.namespace}_${serviceAccount.username}`"
            @download="onDownload"
            @kubeconfig="onKubeconfig"
            @delete="onDeleteServiceAccount"
            @edit="onEditServiceAccount"
          ></project-service-account-row>
        </template>
      </v-list>
    </v-card>

    <member-dialog type="adduser" v-model="userAddDialog"></member-dialog>
    <member-dialog type="addservice" v-model="serviceAccountAddDialog"></member-dialog>
    <member-dialog type="updateuser" :name="memberName" :isCurrentUser="isCurrentUser(memberName)" :roles="memberRoles" v-model="userUpdateDialog"></member-dialog>
    <member-dialog type="updateservice" :name="memberName" :description="serviceAccountDescription" :isCurrentUser="isCurrentUser(memberName)" :roles="memberRoles" v-model="serviceAccountUpdateDialog"></member-dialog>
    <member-help-dialog type="user" v-model="userHelpDialog"></member-help-dialog>
    <member-help-dialog type="service" v-model="serviceAccountHelpDialog"></member-help-dialog>
    <v-dialog v-model="kubeconfigDialog" persistent max-width="67%">
      <v-card>
        <v-card-title class="teal darken-2 grey--text text--lighten-4">
          <div class="headline">Kubeconfig <code class="serviceAccount_name">{{currentServiceAccountDisplayName}}</code></div>
          <v-spacer></v-spacer>
          <v-btn icon class="grey--text text--lighten-4" @click.native="kubeconfigDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <code-block lang="yaml" :content="currentServiceAccountKubeconfig"></code-block>
        </v-card-text>
      </v-card>
    </v-dialog>
    <confirm-dialog ref="confirmDialog"></confirm-dialog>
    <v-fab-transition v-if="canManageServiceAccountMembers || canManageMembers">
      <v-speed-dial v-model="fab" v-show="floatingButton" fixed bottom right direction="top" transition="slide-y-reverse-transition"  >
        <template v-slot:activator>
          <v-btn v-model="fab" color="teal darken-2" dark fab>
            <v-icon v-if="fab">mdi-close</v-icon>
            <v-icon v-else>mdi-plus</v-icon>
          </v-btn>
        </template>
        <v-btn v-if="canManageServiceAccountMembers" fab small color="grey lighten-2" light @click="openServiceAccountAddDialog">
          <v-icon color="blue-grey darken-2">mdi-monitor</v-icon>
        </v-btn>
        <v-btn v-if="canManageMembers" fab small color="grey lighten-2" @click="openUserAddDialog">
          <v-icon color="green darken-2">mdi-account</v-icon>
        </v-btn>
      </v-speed-dial>
    </v-fab-transition>
  </v-container>
</template>

<script>
import { mapState, mapActions, mapGetters } from 'vuex'
import includes from 'lodash/includes'
import toLower from 'lodash/toLower'
import replace from 'lodash/replace'
import sortBy from 'lodash/sortBy'
import download from 'downloadjs'
import filter from 'lodash/filter'
import forEach from 'lodash/forEach'
import join from 'lodash/join'
import map from 'lodash/map'
import get from 'lodash/get'

import MemberDialog from '@/components/dialogs/MemberDialog'
import MemberHelpDialog from '@/components/dialogs/MemberHelpDialog'
import ConfirmDialog from '@/components/dialogs/ConfirmDialog'
import CodeBlock from '@/components/CodeBlock'
import ProjectUserRow from '@/components/ProjectUserRow'
import ProjectServiceAccountRow from '@/components/ProjectServiceAccountRow'
import RemoveProjectMember from '@/components/messages/RemoveProjectMember'
import DeleteServiceAccount from '@/components/messages/DeleteServiceAccount'

import {
  displayName,
  gravatarUrlGeneric,
  isEmail,
  parseServiceAccountUsername,
  isForeignServiceAccount,
  isServiceAccountUsername,
  getTimestampFormatted,
  getProjectDetails,
  sortedRoleDisplayNames
} from '@/utils'

import { getMember } from '@/utils/api'

export default {
  name: 'members',
  components: {
    MemberDialog,
    MemberHelpDialog,
    CodeBlock,
    ProjectUserRow,
    ProjectServiceAccountRow,
    ConfirmDialog
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
      memberName: undefined,
      memberRoles: undefined,
      serviceAccountDescription: undefined,
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
      'canManageMembers',
      'canManageServiceAccountMembers',
      'username',
      'isAdmin',
      'projectList'
    ]),
    project () {
      return this.projectFromProjectList
    },
    projectDetails () {
      return getProjectDetails(this.project)
    },
    owner () {
      return this.projectDetails.owner
    },
    costObject () {
      return this.projectDetails.costObject
    },
    serviceAccountList () {
      const serviceAccounts = filter(this.memberList, ({ username }) => isServiceAccountUsername(username))
      return map(serviceAccounts, serviceAccount => {
        const { username } = serviceAccount
        return {
          ...serviceAccount,
          avatarUrl: gravatarUrlGeneric(username),
          displayName: displayName(username),
          created: getTimestampFormatted(serviceAccount.creationTimestamp),
          roleDisplayNames: this.sortedRoleDisplayNames(serviceAccount.roles),
          isCurrentUser: this.isCurrentUser(username)
        }
      })
    },
    userList () {
      const users = filter(this.memberList, ({ username }) => !isServiceAccountUsername(username))
      return map(users, user => {
        const { username } = user
        return {
          ...user,
          avatarUrl: gravatarUrlGeneric(username),
          displayName: displayName(username),
          isEmail: isEmail(username),
          isOwner: this.isOwner(username),
          roleDisplayNames: this.sortedRoleDisplayNames(user.roles),
          isCurrentUser: this.isCurrentUser(username)
        }
      })
    },
    sortedAndFilteredUserList () {
      const predicate = ({ username }) => {
        if (isServiceAccountUsername(username)) {
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
        const { name } = parseServiceAccountUsername(username)
        return includes(toLower(name), toLower(this.serviceAccountFilter))
      }
      return sortBy(filter(this.serviceAccountList, predicate), 'displayName')
    },
    currentServiceAccountDisplayName () {
      return get(parseServiceAccountUsername(this.currentServiceAccountName), 'name')
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
    isOwner (username) {
      return this.owner === toLower(username)
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
    async onRemoveUser (name) {
      const removalConfirmed = await this.confirmRemoveUser(name)
      if (!removalConfirmed) {
        return
      }
      await this.deleteMember(name)
      if (this.isCurrentUser(name) && !this.isAdmin) {
        if (this.projectList.length > 0) {
          const p1 = this.projectList[0]
          this.$router.push({ name: 'ShootList', params: { namespace: p1.metadata.namespace } })
        } else {
          this.$router.push({ name: 'Home', params: { } })
        }
      }
    },
    confirmRemoveUser (name) {
      const { projectName } = this.projectDetails
      let message
      if (this.isCurrentUser(name)) {
        message = this.$renderComponent(RemoveProjectMember, {
          projectName
        })
      } else {
        message = this.$renderComponent(RemoveProjectMember, {
          projectName,
          name: displayName(name)
        })
      }
      return this.$refs.confirmDialog.waitForConfirmation({
        confirmButtonText: 'Remove User',
        captionText: 'Confirm Remove User',
        messageHtml: message.innerHTML,
        dialogColor: 'red'
      })
    },
    async onDeleteServiceAccount (serviceAccountName) {
      let deletionConfirmed
      if (isForeignServiceAccount(this.namespace, serviceAccountName)) {
        deletionConfirmed = await this.confirmRemoveForeignServiceAccount(serviceAccountName)
      } else {
        deletionConfirmed = await this.confirmDeleteServiceAccount(serviceAccountName)
      }
      if (deletionConfirmed) {
        return this.deleteMember(serviceAccountName)
      }
    },
    confirmRemoveForeignServiceAccount (serviceAccountName) {
      const { projectName } = this.projectDetails
      const { namespace, name } = parseServiceAccountUsername(serviceAccountName)
      const message = this.$renderComponent(RemoveProjectMember, {
        projectName,
        name,
        namespace
      })
      return this.$refs.confirmDialog.waitForConfirmation({
        confirmButtonText: 'Delete',
        captionText: 'Confirm Remove Member',
        messageHtml: message.innerHTML,
        dialogColor: 'red'
      })
    },
    confirmDeleteServiceAccount (name) {
      name = displayName(name)
      const message = this.$renderComponent(DeleteServiceAccount, {
        name
      })
      return this.$refs.confirmDialog.waitForConfirmation({
        confirmButtonText: 'Delete',
        captionText: 'Confirm Member Deletion',
        messageHtml: message.innerHTML,
        dialogColor: 'red',
        confirmValue: name
      })
    },
    onEditUser (username, roles) {
      this.memberName = username
      this.memberRoles = roles
      this.openUserUpdateDialog()
    },
    onEditServiceAccount (username, roles, description) {
      this.memberName = username
      this.memberRoles = roles
      this.serviceAccountDescription = description
      this.openServiceAccountUpdateDialog()
    },
    sortedRoleDisplayNames (roleNames) {
      return sortedRoleDisplayNames(roleNames)
    },
    isCurrentUser (username) {
      return this.username === username
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

<style lang="scss" scoped>

  .searchField {
    margin-right: 20px !important;
  }

  .v-input__slot {
    margin: 0px;
  }

  .serviceAccount_name {
    color: rgb(0, 137, 123);
  }
</style>
