<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-container fluid>
    <v-card class="mt-6">
      <v-toolbar flat color="accent accentTitle--text">
        <v-icon class="pr-2" color="accentTitle">mdi-account-multiple</v-icon>
        <v-toolbar-title class="subtitle-1">
          Project Users
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-text-field v-if="userList.length > 3"
          class="mr-3"
          prepend-inner-icon="mdi-magnify"
          color="primary"
          label="Search"
          hide-details
          flat
          solo
          clearable
          v-model="userFilter"
          @keyup.esc="userFilter=''"
        ></v-text-field>
        <v-btn v-if="allEmails" icon :href="`mailto:${allEmails}`">
          <v-icon color="accentTitle">mdi-email-outline</v-icon>
        </v-btn>
        <v-btn v-if="canManageMembers" icon @click.native.stop="openUserAddDialog">
          <v-icon color="accentTitle">mdi-plus</v-icon>
        </v-btn>
        <v-btn color="accentTitle" icon @click.native.stop="openUserHelpDialog">
          <v-icon color="accentTitle">mdi-help-circle-outline</v-icon>
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

    <v-card class="mt-6">
      <v-toolbar flat color="accent  accentTitle--text">
        <v-icon color="accentTitle" class="pr-2">mdi-monitor-multiple</v-icon>
        <v-toolbar-title class="subtitle-1">
          Service Accounts
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-text-field v-if="serviceAccountList.length > 3"
          class="mr-3"
          prepend-inner-icon="mdi-magnify"
          color="accent accentTitle--text"
          label="Search"
          hide-details
          flat
          solo
          clearable
          v-model="serviceAccountFilter"
          @keyup.esc="serviceAccountFilter=''"
        ></v-text-field>
        <v-btn v-if="canManageServiceAccountMembers" icon @click.native.stop="openServiceAccountAddDialog">
          <v-icon color="accentTitle">mdi-plus</v-icon>
        </v-btn>
        <v-btn icon @click.native.stop="openServiceAccountHelpDialog">
          <v-icon color="accentTitle">mdi-help-circle-outline</v-icon>
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
        <v-card-title class="accent accentTitle--text">
          <div class="headline">Kubeconfig <code class="accent lighten-1 accentTitle--text">{{currentServiceAccountDisplayName}}</code></div>
          <v-spacer></v-spacer>
          <v-btn icon @click.native="kubeconfigDialog = false">
            <v-icon color="accentTitle">mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <code-block lang="yaml" :content="currentServiceAccountKubeconfig"></code-block>
        </v-card-text>
      </v-card>
    </v-dialog>
    <confirm-dialog ref="confirmDialog"></confirm-dialog>
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
