<!-- eslint-disable vuetify/no-deprecated-components -->
<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-container fluid>
    <v-card class="ma-3">
      <g-toolbar
        prepend-icon="mdi-account-multiple"
        title="Project Users"
      >
        <template #append>
          <v-text-field v-if="userList.length > 3"
            class="mr-3"
            prepend-inner-icon="mdi-magnify"
            color="primary"
            label="Search"
            hide-details
            variant="solo"
            clearable
            density="compact"
            v-model="userFilter"
            @keyup.esc="userFilter = ''"
          ></v-text-field>
          <v-tooltip location="top" v-if="allEmails" >
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" icon="mdi-email-outline" :href="`mailto:${allEmails}`" />
            </template>
            <span>Mail to all Members</span>
          </v-tooltip>
          <v-tooltip location="top" v-if="canManageMembers" >
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" icon="mdi-plus" @click.stop="openUserAddDialog" />
            </template>
            <span>Add Member</span>
          </v-tooltip>
          <v-tooltip location="top" v-if="canManageMembers" >
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" icon="mdi-help-circle-outline" @click.stop="openUserHelpDialog" />
            </template>
            <span>Help</span>
          </v-tooltip>
          <g-table-column-selection
            :headers="userAccountTableHeaders"
            @set-selected-header="setSelectedHeaderUserAccount"
            @reset="resetTableSettingsUserAccount"
          ></g-table-column-selection>
        </template>
      </g-toolbar>

      <v-card-text v-if="!userList.length">
        <div class="text-h6 text-grey-darken-1 my-4">Add users to your project.</div>
        <p class="text-body-1">
          Adding users to your project allows you to collaborate across your team.
          Access to resources within your project can be configured by assigning roles.
        </p>
      </v-card-text>
      <!--- TODO v-data-table
        - sort currently not working (custom-sort has been removed)
        - footer-props="{ 'items-per-page-options': [5, 10, 20] }" (option to set footer props has been removed)
        - options property has been removed (need to set options individually)
      --->
      <v-data-table
        v-else
        :headers="visibleUserAccountTableHeaders"
        :items="userList"
        :footer-props="{ 'items-per-page-options': [5, 10, 20] }"
        v-model:options="userAccountTableOptions"
        must-sort
        :custom-sort="sortAccounts"
        :search="userFilter"
        density="compact"
        class="g-table"
      >
        <template v-slot:item="{ item }">
          <g-user-row
            :item="item.value"
            :headers="userAccountTableHeaders"
            :key="item.value.username"
            @delete="onRemoveUser"
            @edit="onEditUser"
          ></g-user-row>
        </template>
      </v-data-table>
    </v-card>

    <v-card class="ma-3 mt-6">
      <g-toolbar
        prepend-icon="mdi-monitor-multiple"
        title="Service Accounts"
      >
        <template #append>
          <v-text-field v-if="serviceAccountList.length > 3"
            class="mr-3"
            prepend-inner-icon="mdi-magnify"
            color="primary"
            label="Search"
            hide-details
            variant="solo"
            clearable
            density="compact"
            v-model="serviceAccountFilter"
            @keyup.esc="serviceAccountFilter = ''"
          ></v-text-field>
          <v-tooltip location="top" v-if="canManageServiceAccountMembers && canCreateServiceAccounts" >
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" icon="mdi-plus" @click.stop="openServiceAccountAddDialog" />
            </template>
            <span>Create Service Account</span>
          </v-tooltip>
          <v-tooltip location="top">
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" icon ="mdi-help-circle-outline" @click.stop="openServiceAccountHelpDialog" />
            </template>
            <span>Help</span>
          </v-tooltip>
          <g-table-column-selection
            :headers="serviceAccountTableHeaders"
            @set-selected-header="setSelectedHeaderServiceAccount"
            @reset="resetTableSettingsServiceAccount"
          ></g-table-column-selection>
        </template>
      </g-toolbar>

      <v-card-text v-if="!serviceAccountList.length">
        <div class="text-h6 text-grey-darken-1 my-4">Add service accounts to your project.</div>
        <p class="text-body-1">
          Adding service accounts to your project allows you to automate processes in your project.
          Access to resources within your project can be configured by assigning roles.
        </p>
      </v-card-text>
      <!--- TODO v-data-table
        - sort currently not working (custom-sort has been removed)
        - footer-props="{ 'items-per-page-options': [5, 10, 20] }" (option to set footer props has been removed)
        - options property has been removed (need to set options individually)
      --->
      <v-data-table
        v-else
        :headers="visibleServiceAccountTableHeaders"
        :items="serviceAccountList"
        :footer-props="{ 'items-per-page-options': [5, 10, 20] }"
        v-model:options="serviceAccountTableOptions"
        must-sort
        :custom-sort="sortAccounts"
        :search="serviceAccountFilter"
        class="g-table"
      >
        <template v-slot:item="{ item }">
          <g-service-account-row
            :item="item.value"
            :headers="serviceAccountTableHeaders"
            :key="`${item.value.namespace}_${item.value.username}`"
            @download="onDownload"
            @kubeconfig="onKubeconfig"
            @reset-serviceaccount="onResetServiceAccount"
            @delete="onGDeleteServiceAccount"
            @edit="onEditServiceAccount"
          ></g-service-account-row>
        </template>
      </v-data-table>
    </v-card>

    <g-member-dialog type="adduser" v-model="userAddDialog"></g-member-dialog>
    <g-member-dialog type="addservice" v-model="serviceAccountAddDialog"></g-member-dialog>
    <g-member-dialog type="updateuser" :name="memberName" :is-current-user="isCurrentUser(memberName)" :roles="memberRoles" v-model="userUpdateDialog"></g-member-dialog>
    <g-member-dialog type="updateservice" :name="memberName" :description="serviceAccountDescription" :is-current-user="isCurrentUser(memberName)" :roles="memberRoles" :orphaned="orphaned" v-model="serviceAccountUpdateDialog"></g-member-dialog>
    <g-member-help-dialog type="service" v-model="serviceAccountHelpDialog"></g-member-help-dialog>
    <g-member-help-dialog type="user" v-model="userHelpDialog"></g-member-help-dialog>
    <g-confirm-dialog ref="confirmDialog"></g-confirm-dialog>

    <v-dialog v-model="kubeconfigDialog" persistent max-width="67%">
      <v-card>
        <v-card-title class="bg-toolbar-background text-toolbar-title d-flex">
          <div class="text-h5">Kubeconfig <code class="bg-toolbar-background-lighten-1">{{ currentServiceAccountDisplayName }}</code></div>
          <v-spacer></v-spacer>
          <g-action-button
            icon="mdi-close"
            @click="kubeconfigDialog = false"
            color="toolbar-title"
          />
        </v-card-title>
        <v-card-text>
          <g-code-block lang="yaml" :content="currentServiceAccountKubeconfig"></g-code-block>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, unref, computed, inject } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import download from 'downloadjs'

import includes from 'lodash/includes'
import toLower from 'lodash/toLower'
import orderBy from 'lodash/orderBy'
import filter from 'lodash/filter'
import forEach from 'lodash/forEach'
import join from 'lodash/join'
import map from 'lodash/map'
import get from 'lodash/get'
import head from 'lodash/head'

import GUserRow from '@/components/Members/GUserRow.vue'
import GServiceAccountRow from '@/components/Members/GServiceAccountRow.vue'
import GTableColumnSelection from '@/components/GTableColumnSelection.vue'
import GMemberDialog from '@/components/Members/GMemberDialog.vue'
import GMemberHelpDialog from '@/components/Members/GMemberHelpDialog.vue'
import GConfirmDialog from '@/components/dialogs/GConfirmDialog.vue'
import GRemoveProjectMember from '@/components/messages/GRemoveProjectMember.vue'
import GDeleteServiceAccount from '@/components/messages/GDeleteServiceAccount.vue'
import GResetServiceAccount from '@/components/messages/GResetServiceAccount.vue'
import GCodeBlock from '@/components/GCodeBlock.vue'
import GToolbar from '@/components/GToolbar.vue'
import GActionButton from '@/components/GActionButton.vue'

import {
  useAuthzStore,
  useProjectStore,
  useAuthnStore,
  useMemberStore,
  useAppStore,
} from '@/store'

import {
  displayName,
  gravatarUrlGeneric,
  isEmail,
  parseServiceAccountUsername,
  isForeignServiceAccount,
  isServiceAccountUsername,
  getProjectDetails,
  sortedRoleDisplayNames,
  mapTableHeader,
} from '@/utils'

import { useLocalStorage } from '@vueuse/core'
import { useApi } from '@/composables'
const renderComponent = inject('renderComponent')

const api = useApi()
const projectStore = useProjectStore()
const authzStore = useAuthzStore()
const authnStore = useAuthnStore()
const memberStore = useMemberStore()
const appStore = useAppStore()
const router = useRouter()

const defaultUserAccountTableOptions = {
  itemsPerPage: 10,
  sortBy: ['username'],
  sortDesc: [false],
}
const defaultServiceAccountTableOptions = {
  itemsPerPage: 5,
  sortBy: ['displayName'],
  sortDesc: [false],
}

const userAddDialog = ref(false)
const serviceAccountAddDialog = ref(false)
const userUpdateDialog = ref(false)
const serviceAccountUpdateDialog = ref(false)
const userHelpDialog = ref(false)
const serviceAccountHelpDialog = ref(false)
const kubeconfigDialog = ref(false)
const memberName = ref()
const memberRoles = ref()
const serviceAccountDescription = ref()
const orphaned = ref(false)
const userFilter = ref('')
const serviceAccountFilter = ref('')
const currentServiceAccountName = ref()
const currentServiceAccountKubeconfig = ref()

const {
  namespace,
  projectFromProjectList: project,
  projectList,
} = storeToRefs(projectStore)
const {
  canManageMembers,
  canManageServiceAccountMembers,
  canCreateServiceAccounts,
} = storeToRefs(authzStore)
const {
  username: currentUsername,
  isAdmin,
} = storeToRefs(authnStore)
const { list: memberList } = storeToRefs(memberStore)

const userAccountSelectedColumns = useLocalStorage('members/useraccount-list/selected-columns', {})
const userAccountTableOptions = useLocalStorage('members/useraccount-list/options', defaultUserAccountTableOptions)
const serviceAccountSelectedColumns = useLocalStorage('members/serviceaccount-list/selected-columns', {})
const serviceAccountTableOptions = useLocalStorage('members/serviceaccount-list/options', defaultServiceAccountTableOptions)

const confirmDialog = ref(null)

const projectDetails = computed(() => {
  return getProjectDetails(project.value)
})

const owner = computed(() => {
  return projectDetails.value.owner
})

const userList = computed(() => {
  const users = filter(memberList.value, ({ username }) => !isServiceAccountUsername(username))
  return map(users, user => {
    const { username } = user
    return {
      ...user,
      avatarUrl: gravatarUrlGeneric(username),
      displayName: displayName(username),
      isEmail: isEmail(username),
      isOwner: isOwner(username),
      roleDisplayNames: sortedRoleDisplayNames(user.roles),
      isCurrentUser: isCurrentUser(username),
    }
  })
})

const allEmails = computed(() => {
  const emails = []
  forEach(userList.value, ({ username }) => {
    if (isEmail(username)) {
      emails.push(username)
    }
  })
  return join(emails, ';')
})

const userAccountTableHeaders = computed(() => {
  const headers = [
    {
      title: 'NAME',
      align: 'start',
      value: 'username',
      sortable: true,
      defaultSelected: true,
    },
    {
      title: 'ROLES',
      align: 'end',
      value: 'roles',
      sortable: true,
      defaultSelected: true,
    },
    {
      title: 'ACTIONS',
      align: 'end',
      value: 'actions',
      sortable: false,
      defaultSelected: true,
    },
  ]
  return map(headers, header => ({
    ...header,
    class: 'nowrap',
    selected: get(userAccountSelectedColumns.value, header.value, header.defaultSelected),
  }))
})

const visibleUserAccountTableHeaders = computed(() => {
  return filter(userAccountTableHeaders.value, ['selected', true])
})

const serviceAccountList = computed(() => {
  const serviceAccounts = filter(memberList.value, ({ username }) => isServiceAccountUsername(username))
  return map(serviceAccounts, serviceAccount => {
    const { username } = serviceAccount
    return {
      ...serviceAccount,
      avatarUrl: gravatarUrlGeneric(username),
      displayName: displayName(username),
      roleDisplayNames: sortedRoleDisplayNames(serviceAccount.roles),
      isCurrentUser: isCurrentUser(username),
    }
  })
})

const currentServiceAccountDisplayName = computed(() => {
  return get(parseServiceAccountUsername(currentServiceAccountName.value), 'name')
})

const serviceAccountTableHeaders = computed(() => {
  const headers = [
    {
      title: 'NAME',
      align: 'start',
      value: 'displayName',
      sortable: true,
      defaultSelected: true,
    },
    {
      title: 'CREATED BY',
      align: 'start',
      value: 'createdBy',
      sortable: true,
      defaultSelected: true,
    },
    {
      title: 'CREATED AT',
      align: 'start',
      value: 'creationTimestamp',
      sortable: true,
      defaultSelected: true,
    },
    {
      title: 'DESCRIPTION',
      align: 'start',
      value: 'description',
      sortable: true,
      defaultSelected: true,
    },
    {
      title: 'ROLES',
      align: 'end',
      value: 'roles',
      sortable: true,
      defaultSelected: true,
    },
    {
      title: 'ACTIONS',
      align: 'end',
      value: 'actions',
      sortable: false,
      defaultSelected: true,
    },
  ]
  return map(headers, header => ({
    ...header,
    class: 'nowrap',
    selected: get(serviceAccountSelectedColumns.value, header.value, header.defaultSelected),
  }))
})

const visibleServiceAccountTableHeaders = computed(() => {
  return filter(serviceAccountTableHeaders.value, ['selected', true])
})

function setKubeconfigError (err) {
  appStore.alert = {
    type: 'error',
    title: 'Kubeconfig Error',
    message: err.message,
  }
}

function openUserAddDialog () {
  userAddDialog.value = true
}

function openUserUpdateDialog () {
  userUpdateDialog.value = true
}

function openUserHelpDialog () {
  userHelpDialog.value = true
}

function openServiceAccountAddDialog () {
  serviceAccountAddDialog.value = true
}

function openServiceAccountUpdateDialog () {
  serviceAccountUpdateDialog.value = true
}

function openServiceAccountHelpDialog () {
  serviceAccountHelpDialog.value = true
}

function isOwner (username) {
  return owner.value === toLower(username)
}

async function downloadKubeconfig (name) {
  try {
    const { data } = await api.getMember({ namespace: namespace.value, name })
    if (!data.kubeconfig) {
      setKubeconfigError({ message: 'Failed to fetch Kubeconfig' })
    } else {
      return data.kubeconfig
    }
  } catch (err) {
    setKubeconfigError(err)
  }
}

async function onDownload ({ username }) {
  const kubeconfig = await downloadKubeconfig(username)
  if (kubeconfig) {
    download(kubeconfig, 'kubeconfig.yaml', 'text/yaml')
  }
}

async function onKubeconfig ({ username }) {
  const kubeconfig = await downloadKubeconfig(username)
  if (kubeconfig) {
    currentServiceAccountName.value = username
    currentServiceAccountKubeconfig.value = kubeconfig
    kubeconfigDialog.value = true
  }
}

async function onRemoveUser ({ username }) {
  const removalConfirmed = await confirmRemoveUser(username)
  if (!removalConfirmed) {
    return
  }
  await memberStore.deleteMember(username)
  if (isCurrentUser(username) && !isAdmin.value) {
    if (projectList.value.length > 0) {
      const p1 = projectList.value[0]
      await router.push({ name: 'ShootList', params: { namespace: p1.metadata.namespace } })
    } else {
      await router.push({ name: 'Home', params: {} })
    }
  }
}

function confirmRemoveUser (name) {
  const { projectName } = projectDetails.value
  let message
  if (isCurrentUser(name)) {
    message = renderComponent(GRemoveProjectMember, {
      projectName,
    })
  } else {
    message = renderComponent(GRemoveProjectMember, {
      projectName,
      memberName: displayName(name),
    })
  }
  return confirmDialog.value.waitForConfirmation({
    confirmButtonText: 'Remove User',
    captionText: 'Confirm Remove User',
    messageHtml: message.innerHTML,
  })
}

async function onGDeleteServiceAccount ({ username }) {
  let deletionConfirmed
  if (isForeignServiceAccount(namespace.value, username)) {
    deletionConfirmed = await confirmRemoveForeignServiceAccount(username)
  } else {
    deletionConfirmed = await confirmGDeleteServiceAccount(username)
  }
  if (deletionConfirmed) {
    return memberStore.deleteMember(username)
  }
}

async function onResetServiceAccount ({ username }) {
  const resetConfirmed = await confirmResetServiceAccount(username)
  if (resetConfirmed) {
    return memberStore.resetServiceAccount(username)
  }
}

function confirmRemoveForeignServiceAccount (serviceAccountName) {
  const { projectName } = projectDetails.value
  const { namespace, name } = parseServiceAccountUsername(serviceAccountName)
  const message = renderComponent(GRemoveProjectMember, {
    projectName,
    memberName: name,
    namespace,
  })
  return confirmDialog.value.waitForConfirmation({
    confirmButtonText: 'Delete',
    captionText: 'Confirm Remove Member',
    messageHtml: message.innerHTML,
  })
}

function confirmGDeleteServiceAccount (name) {
  name = displayName(name)
  const message = renderComponent(GDeleteServiceAccount, {
    name,
  })
  return confirmDialog.value.waitForConfirmation({
    confirmButtonText: 'Delete',
    captionText: 'Confirm Service Account Deletion',
    messageHtml: message.innerHTML,
    confirmValue: name,
    width: '550',
  })
}

function confirmResetServiceAccount (name) {
  name = displayName(name)
  const message = renderComponent(GResetServiceAccount, {
    name,
  })
  return confirmDialog.value.waitForConfirmation({
    confirmButtonText: 'Reset',
    captionText: 'Confirm Service Account Reset',
    messageHtml: message.innerHTML,
    confirmValue: name,
  })
}

function onEditUser ({ username, roles }) {
  memberName.value = username
  memberRoles.value = roles
  openUserUpdateDialog()
}

function onEditServiceAccount ({ username, roles, description, orphaned: orphanedParam }) {
  memberName.value = username
  memberRoles.value = roles
  serviceAccountDescription.value = description
  orphaned.value = orphanedParam
  openServiceAccountUpdateDialog()
}

function isCurrentUser (username) {
  return currentUsername.value === username
}

function getSortVal (item, sortBy) {
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
}

function sortAccounts (items, sortByArr, sortDescArr) {
  const sortBy = head(sortByArr)
  const sortOrder = head(sortDescArr) ? 'desc' : 'asc'
  const sortedItems = orderBy(unref(items), [item => getSortVal(item, sortBy), 'username'], [sortOrder, 'asc'])
  return sortedItems
}

function setSelectedHeaderUserAccount (header) {
  userAccountSelectedColumns.value[header.value] = !header.selected
}

function resetTableSettingsUserAccount () {
  userAccountSelectedColumns.value = mapTableHeader(userAccountTableHeaders.value, 'defaultSelected')
  userAccountTableOptions.value = defaultUserAccountTableOptions
}

function setSelectedHeaderServiceAccount (header) {
  serviceAccountSelectedColumns.value[header.value] = !header.selected
}

function resetTableSettingsServiceAccount () {
  serviceAccountSelectedColumns.value = mapTableHeader(serviceAccountTableHeaders.value, 'defaultSelected')
  serviceAccountTableOptions.value = defaultServiceAccountTableOptions
}

</script>

<style lang="scss" scoped>
  .g-table {
    font-size: 14px;
    :deep(.v-data-table-header__content) {
      white-space: nowrap !important;
    }
  }
</style>
