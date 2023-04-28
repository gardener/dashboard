<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-container fluid>
    <v-card class="ma-3">
      <v-toolbar flat color="toolbar-background toolbar-title--text">
        <v-icon class="pr-2" color="toolbar-title">mdi-account-multiple</v-icon>
        <v-toolbar-title class="text-subtitle-1">
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
          variant="solo"
          clearable
          v-model="userFilter"
          @keyup.esc="userFilter=''"
        ></v-text-field>
        <v-tooltip location="top" v-if="allEmails" >
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon :href="`mailto:${allEmails}`">
              <v-icon color="toolbar-title">mdi-email-outline</v-icon>
            </v-btn>
          </template>
          <span>Mail to all Members</span>
        </v-tooltip>
        <v-tooltip location="top" v-if="canManageMembers" >
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon @click.stop="openUserAddDialog">
              <v-icon color="toolbar-title">mdi-plus</v-icon>
            </v-btn>
          </template>
          <span>Add Member</span>
        </v-tooltip>
        <v-tooltip location="top" v-if="canManageMembers" >
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" color="toolbar-title" icon @click.stop="openUserHelpDialog">
              <v-icon color="toolbar-title">mdi-help-circle-outline</v-icon>
            </v-btn>
          </template>
          <span>Help</span>
        </v-tooltip>
        <table-column-selection
          :headers="userAccountTableHeaders"
          @set-selected-header="setSelectedHeaderUserAccount"
          @reset="resetTableSettingsUserAccount"
        ></table-column-selection>
      </v-toolbar>

      <v-card-text v-if="!userList.length">
        <div class="text-h6 text-grey-darken-1 my-4">Add users to your project.</div>
        <p class="text-body-1">
          Adding users to your project allows you to collaborate across your team.
          Access to resources within your project can be configured by assigning roles.
        </p>
      </v-card-text>
      <v-data-table
        v-else
        :headers="visibleUserAccountTableHeaders"
        :items="userList"
        :footer-props="{ 'items-per-page-options': [5,10,20] }"
        v-model:options="userAccountTableOptions"
        must-sort
        :custom-sort="sortAccounts"
        :search="userFilter"
      >
        <template v-slot:item="{ item }">
          <project-user-row
            :item="item"
            :headers="userAccountTableHeaders"
            :key="user.username"
            @delete="onRemoveUser"
            @edit="onEditUser"
          ></project-user-row>
        </template>
      </v-data-table>
    </v-card>

    <v-card class="ma-3 mt-6">
      <v-toolbar flat color="toolbar-background  toolbar-title--text">
        <v-icon color="toolbar-title" class="pr-2">mdi-monitor-multiple</v-icon>
        <v-toolbar-title class="text-subtitle-1">
          Service Accounts
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-text-field v-if="serviceAccountList.length > 3"
          class="mr-3"
          prepend-inner-icon="mdi-magnify"
          color="toolbar-background toolbar-title--text"
          label="Search"
          hide-details
          flat
          variant="solo"
          clearable
          v-model="serviceAccountFilter"
          @keyup.esc="serviceAccountFilter=''"
        ></v-text-field>
        <v-tooltip location="top" v-if="canManageServiceAccountMembers && canCreateServiceAccounts" >
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon @click.stop="openServiceAccountAddDialog">
              <v-icon color="toolbar-title">mdi-plus</v-icon>
            </v-btn>
          </template>
          <span>Create Service Account</span>
        </v-tooltip>
        <v-tooltip location="top">
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon @click.stop="openServiceAccountHelpDialog">
              <v-icon color="toolbar-title">mdi-help-circle-outline</v-icon>
            </v-btn>
          </template>
          <span>Help</span>
        </v-tooltip>
        <table-column-selection
          :headers="serviceAccountTableHeaders"
          @set-selected-header="setSelectedHeaderServiceAccount"
          @reset="resetTableSettingsServiceAccount"
        ></table-column-selection>
      </v-toolbar>

      <v-card-text v-if="!serviceAccountList.length">
        <div class="text-h6 text-grey-darken-1 my-4">Add service accounts to your project.</div>
        <p class="text-body-1">
          Adding service accounts to your project allows you to automate processes in your project.
          Access to resources within your project can be configured by assigning roles.
        </p>
      </v-card-text>
      <v-data-table
        v-else
        :headers="visibleServiceAccountTableHeaders"
        :items="serviceAccountList"
        :footer-props="{ 'items-per-page-options': [5,10,20] }"
        v-model:options="serviceAccountTableOptions"
        must-sort
        :custom-sort="sortAccounts"
        :search="serviceAccountFilter"
      >
        <template v-slot:item="{ item }">
          <project-service-account-row
            :item="item"
            :headers="serviceAccountTableHeaders"
            :key="`${item.namespace}_${item.username}`"
            @download="onDownload"
            @kubeconfig="onKubeconfig"
            @reset-serviceaccount="onResetServiceAccount"
            @delete="onDeleteServiceAccount"
            @edit="onEditServiceAccount"
          ></project-service-account-row>
        </template>
      </v-data-table>
    </v-card>

    <member-dialog type="adduser" v-model="userAddDialog"></member-dialog>
    <member-dialog type="addservice" v-model="serviceAccountAddDialog"></member-dialog>
    <member-dialog type="updateuser" :name="memberName" :is-current-user="isCurrentUser(memberName)" :roles="memberRoles" v-model="userUpdateDialog"></member-dialog>
    <member-dialog type="updateservice" :name="memberName" :description="serviceAccountDescription" :is-current-user="isCurrentUser(memberName)" :roles="memberRoles" :orphaned="orphaned" v-model="serviceAccountUpdateDialog"></member-dialog>
    <member-help-dialog type="user" v-model="userHelpDialog"></member-help-dialog>
    <member-help-dialog type="service" v-model="serviceAccountHelpDialog"></member-help-dialog>
    <v-dialog v-model="kubeconfigDialog" persistent max-width="67%">
      <v-card>
        <v-card-title class="toolbar-background toolbar-title--text">
          <div class="text-h5">Kubeconfig <code class="toolbar-background lighten-1 toolbar-title--text">{{currentServiceAccountDisplayName}}</code></div>
          <v-spacer></v-spacer>
          <v-btn icon @click="kubeconfigDialog = false">
            <v-icon color="toolbar-title">mdi-close</v-icon>
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
import orderBy from 'lodash/orderBy'
import download from 'downloadjs'
import filter from 'lodash/filter'
import forEach from 'lodash/forEach'
import join from 'lodash/join'
import map from 'lodash/map'
import get from 'lodash/get'
import head from 'lodash/head'

import MemberDialog from '@/components/dialogs/MemberDialog.vue'
import MemberHelpDialog from '@/components/dialogs/MemberHelpDialog.vue'
import ConfirmDialog from '@/components/dialogs/ConfirmDialog.vue'
import CodeBlock from '@/components/CodeBlock.vue'
import ProjectUserRow from '@/components/ProjectUserRow.vue'
import ProjectServiceAccountRow from '@/components/ProjectServiceAccountRow.vue'
import RemoveProjectMember from '@/components/messages/RemoveProjectMember.vue'
import DeleteServiceAccount from '@/components/messages/DeleteServiceAccount.vue'
import ResetServiceAccount from '@/components/messages/ResetServiceAccount.vue'
import TableColumnSelection from '@/components/TableColumnSelection.vue'

import {
  displayName,
  gravatarUrlGeneric,
  isEmail,
  parseServiceAccountUsername,
  isForeignServiceAccount,
  isServiceAccountUsername,
  getProjectDetails,
  sortedRoleDisplayNames,
  mapTableHeader
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
    ConfirmDialog,
    TableColumnSelection
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
      orphaned: false,
      userFilter: '',
      serviceAccountFilter: '',
      currentServiceAccountName: undefined,
      currentServiceAccountKubeconfig: undefined,
      userAccountTableOptions: undefined,
      serviceAccountTableOptions: undefined,
      defaultUserAccountTableOptions: {
        itemsPerPage: 10,
        sortBy: ['username'],
        sortDesc: [false]
      },
      defaultServiceAccountTableOptions: {
        itemsPerPage: 5,
        sortBy: ['displayName'],
        sortDesc: [false]
      },
      userAccountSelectedColumns: {},
      serviceAccountSelectedColumns: {}
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
      'canCreateServiceAccounts',
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
    allEmails () {
      const emails = []
      forEach(this.userList, ({ username }) => {
        if (isEmail(username)) {
          emails.push(username)
        }
      })
      return join(emails, ';')
    },
    userAccountTableHeaders () {
      const headers = [
        {
          text: 'NAME',
          align: 'start',
          value: 'username',
          sortable: true,
          defaultSelected: true
        },
        {
          text: 'ROLES',
          align: 'end',
          value: 'roles',
          sortable: true,
          defaultSelected: true
        },
        {
          text: 'ACTIONS',
          align: 'end',
          value: 'actions',
          sortable: false,
          defaultSelected: true
        }
      ]
      return map(headers, header => ({
        ...header,
        class: 'nowrap',
        selected: get(this.userAccountSelectedColumns, header.value, header.defaultSelected)
      }))
    },
    visibleUserAccountTableHeaders () {
      return filter(this.userAccountTableHeaders, ['selected', true])
    },
    serviceAccountList () {
      const serviceAccounts = filter(this.memberList, ({ username }) => isServiceAccountUsername(username))
      return map(serviceAccounts, serviceAccount => {
        const { username } = serviceAccount
        return {
          ...serviceAccount,
          avatarUrl: gravatarUrlGeneric(username),
          displayName: displayName(username),
          roleDisplayNames: this.sortedRoleDisplayNames(serviceAccount.roles),
          isCurrentUser: this.isCurrentUser(username)
        }
      })
    },
    currentServiceAccountDisplayName () {
      return get(parseServiceAccountUsername(this.currentServiceAccountName), 'name')
    },
    serviceAccountTableHeaders () {
      const headers = [
        {
          text: 'NAME',
          align: 'start',
          value: 'displayName',
          sortable: true,
          defaultSelected: true
        },
        {
          text: 'CREATED BY',
          align: 'start',
          value: 'createdBy',
          sortable: true,
          defaultSelected: true
        },
        {
          text: 'CREATED AT',
          align: 'start',
          value: 'creationTimestamp',
          sortable: true,
          defaultSelected: true
        },
        {
          text: 'DESCRIPTION',
          align: 'start',
          value: 'description',
          sortable: true,
          defaultSelected: true
        },
        {
          text: 'ROLES',
          align: 'end',
          value: 'roles',
          sortable: true,
          defaultSelected: true
        },
        {
          text: 'ACTIONS',
          align: 'end',
          value: 'actions',
          sortable: false,
          defaultSelected: true
        }
      ]
      return map(headers, header => ({
        ...header,
        class: 'nowrap',
        selected: get(this.serviceAccountSelectedColumns, header.value, header.defaultSelected)
      }))
    },
    visibleServiceAccountTableHeaders () {
      return filter(this.serviceAccountTableHeaders, ['selected', true])
    }
  },
  methods: {
    ...mapActions([
      'addMember',
      'deleteMember',
      'resetServiceAccount',
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
    async onDownload ({ username }) {
      const kubeconfig = await this.downloadKubeconfig(username)
      if (kubeconfig) {
        download(kubeconfig, 'kubeconfig.yaml', 'text/yaml')
      }
    },
    async onKubeconfig ({ username }) {
      const kubeconfig = await this.downloadKubeconfig(username)
      if (kubeconfig) {
        this.currentServiceAccountName = username
        this.currentServiceAccountKubeconfig = kubeconfig
        this.kubeconfigDialog = true
      }
    },
    async onRemoveUser ({ username }) {
      const removalConfirmed = await this.confirmRemoveUser(username)
      if (!removalConfirmed) {
        return
      }
      await this.deleteMember(username)
      if (this.isCurrentUser(username) && !this.isAdmin) {
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
          memberName: displayName(name)
        })
      }
      return this.$refs.confirmDialog.waitForConfirmation({
        confirmButtonText: 'Remove User',
        captionText: 'Confirm Remove User',
        messageHtml: message.innerHTML
      })
    },
    async onDeleteServiceAccount ({ username }) {
      let deletionConfirmed
      if (isForeignServiceAccount(this.namespace, username)) {
        deletionConfirmed = await this.confirmRemoveForeignServiceAccount(username)
      } else {
        deletionConfirmed = await this.confirmDeleteServiceAccount(username)
      }
      if (deletionConfirmed) {
        return this.deleteMember(username)
      }
    },
    async onResetServiceAccount ({ username }) {
      const resetConfirmed = await this.confirmResetServiceAccount(username)
      if (resetConfirmed) {
        return this.resetServiceAccount(username)
      }
    },
    confirmRemoveForeignServiceAccount (serviceAccountName) {
      const { projectName } = this.projectDetails
      const { namespace, name } = parseServiceAccountUsername(serviceAccountName)
      const message = this.$renderComponent(RemoveProjectMember, {
        projectName,
        memberName: name,
        namespace
      })
      return this.$refs.confirmDialog.waitForConfirmation({
        confirmButtonText: 'Delete',
        captionText: 'Confirm Remove Member',
        messageHtml: message.innerHTML
      })
    },
    confirmDeleteServiceAccount (name) {
      name = displayName(name)
      const message = this.$renderComponent(DeleteServiceAccount, {
        name
      })
      return this.$refs.confirmDialog.waitForConfirmation({
        confirmButtonText: 'Delete',
        captionText: 'Confirm Service Account Deletion',
        messageHtml: message.innerHTML,
        confirmValue: name,
        width: '550'
      })
    },
    confirmResetServiceAccount (name) {
      name = displayName(name)
      const message = this.$renderComponent(ResetServiceAccount, {
        name
      })
      return this.$refs.confirmDialog.waitForConfirmation({
        confirmButtonText: 'Reset',
        captionText: 'Confirm Service Account Reset',
        messageHtml: message.innerHTML,
        confirmValue: name
      })
    },
    onEditUser ({ username, roles }) {
      this.memberName = username
      this.memberRoles = roles
      this.openUserUpdateDialog()
    },
    onEditServiceAccount ({ username, roles, description, orphaned }) {
      this.memberName = username
      this.memberRoles = roles
      this.serviceAccountDescription = description
      this.orphaned = orphaned
      this.openServiceAccountUpdateDialog()
    },
    sortedRoleDisplayNames (roleNames) {
      return sortedRoleDisplayNames(roleNames)
    },
    isCurrentUser (username) {
      return this.username === username
    },
    getSortVal (item, sortBy) {
      const roles = item.roles
      switch (sortBy) {
        case 'roles':
          if (includes(roles, 'owner')) {
            return 1
          }
          if (includes(roles, 'uam')) {
            return 2
          }
          if (includes(roles, 'admin')) {
            return 3
          }
          if (includes(roles, 'serviceaccountmanager')) {
            return 4
          }
          if (includes(roles, 'viewer')) {
            return 5
          }
          return 6
        default:
          return get(item, sortBy)
      }
    },
    sortAccounts (items, sortByArr, sortDescArr) {
      const sortBy = head(sortByArr)
      const sortOrder = head(sortDescArr) ? 'desc' : 'asc'
      const sortedItems = orderBy(items, [item => this.getSortVal(item, sortBy), 'username'], [sortOrder, 'asc'])
      return sortedItems
    },
    setSelectedHeaderUserAccount (header) {
      this.$set(this.userAccountSelectedColumns, header.value, !header.selected)
      this.saveSelectedColumnsUserAccount()
    },
    resetTableSettingsUserAccount () {
      this.userAccountSelectedColumns = mapTableHeader(this.userAccountTableHeaders, 'defaultSelected')
      this.userAccountTableOptions = this.defaultUserAccountTableOptions
      this.saveSelectedColumnsUserAccount()
    },
    saveSelectedColumnsUserAccount () {
      this.$localStorage.setObject('members/useraccount-list/selected-columns', mapTableHeader(this.userAccountTableHeaders, 'selected'))
    },
    setSelectedHeaderServiceAccount (header) {
      this.$set(this.serviceAccountSelectedColumns, header.value, !header.selected)
      this.saveSelectedColumnsServiceAccount()
    },
    resetTableSettingsServiceAccount () {
      this.serviceAccountSelectedColumns = mapTableHeader(this.serviceAccountTableHeaders, 'defaultSelected')
      this.serviceAccountTableOptions = this.defaultServiceAccountTableOptions
      this.saveSelectedColumnsServiceAccount()
    },
    saveSelectedColumnsServiceAccount () {
      this.$localStorage.setObject('members/serviceaccount-list/selected-columns', mapTableHeader(this.serviceAccountTableHeaders, 'selected'))
    },
    updateTableSettings () {
      this.userAccountSelectedColumns = this.$localStorage.getObject('members/useraccount-list/selected-columns') || {}
      const userAccountTableOptions = this.$localStorage.getObject('members/useraccount-list/options')
      this.userAccountTableOptions = {
        ...this.defaultUserAccountTableOptions,
        ...userAccountTableOptions
      }

      this.serviceAccountSelectedColumns = this.$localStorage.getObject('members/serviceaccount-list/selected-columns') || {}
      const serviceAccountTableOptions = this.$localStorage.getObject('members/serviceaccount-list/options')
      this.serviceAccountTableOptions = {
        ...this.defaultServiceAccountTableOptions,
        ...serviceAccountTableOptions
      }
    },
    closeDialogs () {
      this.userAddDialog = false
      this.userHelpDialog = false
      this.userUpdateDialog = false
      this.serviceAccountAddDialog = false
      this.serviceAccountHelpDialog = false
      this.serviceAccountUpdateDialog = false
      this.kubeconfigDialog = false
    }
  },
  watch: {
    userAccountTableOptions (value) {
      if (!value) {
        return
      }
      const { sortBy, sortDesc, itemsPerPage } = value
      if (!sortBy || !sortBy.length) { // initial table options
        return
      }
      this.$localStorage.setObject('members/useraccount-list/options', { sortBy, sortDesc, itemsPerPage })
    },
    serviceAccountTableOptions (value) {
      if (!value) {
        return
      }
      const { sortBy, sortDesc, itemsPerPage } = value
      if (!sortBy || !sortBy.length) { // initial table options
        return
      }
      this.$localStorage.setObject('members/serviceaccount-list/options', { sortBy, sortDesc, itemsPerPage })
    }
  },
  created () {
    this.$bus.on('esc-pressed', this.closeDialogs)
  },
  beforeUnmount () {
    this.$bus.off('esc-pressed', this.closeDialogs)
  },
  beforeRouteEnter (to, from, next) {
    next(vm => {
      vm.updateTableSettings()
    })
  },
  beforeRouteUpdate (to, from, next) {
    this.updateTableSettings()
    next()
  }
}
</script>
