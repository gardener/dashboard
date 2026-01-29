<!-- eslint-disable vuetify/no-deprecated-components -->
<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-container
    ref="container"
    fluid
    class="container-size"
  >
    <v-card class="ma-3">
      <g-toolbar
        prepend-icon="mdi-account-multiple"
        :height="64"
      >
        <div class="text-h6">
          Project Users
        </div>
        <template #append>
          <v-text-field
            v-if="userList.length > 3"
            v-model="userFilter"
            class="g-table-search-field mr-3"
            prepend-inner-icon="mdi-magnify"
            color="primary"
            label="Search"
            single-line
            hide-details
            variant="solo"
            flat
            clearable
            clear-icon="mdi-close"
            density="compact"
            @keyup.esc="userFilter = ''"
          />
          <v-btn
            v-if="allEmails"
            v-tooltip:top="'Mail to all Members'"
            icon="mdi-email-outline"
            :href="`mailto:${allEmails}`"
          />
          <v-btn
            v-if="canManageMembers"
            v-tooltip:top="'Add Member'"
            icon="mdi-plus"
            @click.stop="openUserAddDialog"
          />
          <v-btn
            v-if="canManageMembers"
            v-tooltip:top="'Help'"
            icon="mdi-help-circle-outline"
            @click.stop="openUserHelpDialog"
          />
          <g-table-column-selection
            :headers="userAccountTableHeaders"
            @set-selected-header="setSelectedHeaderUserAccount"
            @reset="resetTableSettingsUserAccount"
          />
        </template>
      </g-toolbar>

      <v-card-text v-if="!userList.length">
        <div class="text-h6 text-grey-darken-1 my-4">
          Add users to your project.
        </div>
        <p class="text-body-1">
          Adding users to your project allows you to collaborate across your team.
          Access to resources within your project can be configured by assigning roles.
        </p>
      </v-card-text>
      <v-data-table-virtual
        v-else
        v-model:sort-by="userSortBy"
        :headers="visibleUserAccountTableHeaders"
        :items="userSortedList"
        :custom-key-sort="disableCustomKeySort(visibleUserAccountTableHeaders)"
        must-sort
        hover
        :search="userFilter"
        density="compact"
        class="g-table"
        :item-height="itemHeight"
        :style="userTableStyles"
        fixed-header
      >
        <template #item="{ item }">
          <g-user-row
            :key="item.username"
            :item="item"
            :headers="userAccountTableHeaders"
            @delete="onRemoveUser"
            @edit="onEditUser"
          />
        </template>
        <template #bottom>
          <g-data-table-footer
            :items-length="userList.length"
            items-label="Users"
          />
        </template>
      </v-data-table-virtual>
    </v-card>

    <v-card class="ma-3 mt-6">
      <g-toolbar
        prepend-icon="mdi-monitor-multiple"
        :height="64"
      >
        <div class="text-h6">
          Service Accounts
        </div>
        <template #append>
          <v-text-field
            v-if="serviceAccountList.length > 3"
            v-model="serviceAccountFilter"
            class="g-table-search-field mr-3"
            prepend-inner-icon="mdi-magnify"
            color="primary"
            label="Search"
            single-line
            hide-details
            variant="solo"
            flat
            clearable
            clear-icon="mdi-close"
            density="compact"
            @keyup.esc="serviceAccountFilter = ''"
          />
          <v-btn
            v-if="canManageServiceAccountMembers && canCreateServiceAccounts"
            v-tooltip:top="'Create Service Account'"
            icon="mdi-plus"
            @click.stop="openServiceAccountAddDialog"
          />
          <v-btn
            v-tooltip:top="'Help'"
            icon="mdi-help-circle-outline"
            @click.stop="openServiceAccountHelpDialog"
          />
          <g-table-column-selection
            :headers="serviceAccountTableHeaders"
            @set-selected-header="setSelectedHeaderServiceAccount"
            @reset="resetTableSettingsServiceAccount"
          />
        </template>
      </g-toolbar>

      <v-card-text v-if="!serviceAccountList.length">
        <div class="text-h6 text-grey-darken-1 my-4">
          Add service accounts to your project.
        </div>
        <p class="text-body-1">
          Adding service accounts to your project allows you to automate processes in your project.
          Access to resources within your project can be configured by assigning roles.
        </p>
      </v-card-text>
      <v-data-table-virtual
        v-else
        v-model:sort-by="serviceAccountSortBy"
        :headers="visibleServiceAccountTableHeaders"
        :items="serviceAccountSortedList"
        :custom-key-sort="disableCustomKeySort(visibleServiceAccountTableHeaders)"
        must-sort
        hover
        :search="serviceAccountFilter"
        density="compact"
        class="g-table"
        :item-height="itemHeight"
        :style="serviceAccountTableStyles"
        fixed-header
      >
        <template #item="{ item }">
          <g-service-account-row
            :key="`${item.namespace}_${item.username}`"
            :item="item"
            :headers="serviceAccountTableHeaders"
            @download="onDownload"
            @kubeconfig="onKubeconfig"
            @reset-serviceaccount="onResetServiceAccount"
            @delete="onGDeleteServiceAccount"
            @edit="onEditServiceAccount"
          />
        </template>
        <template #bottom>
          <g-data-table-footer
            :items-length="serviceAccountList.length"
            items-label="Service Accounts"
          />
        </template>
      </v-data-table-virtual>
    </v-card>

    <g-member-dialog
      v-model="userAddDialog"
      type="adduser"
    />
    <g-member-dialog
      v-model="serviceAccountAddDialog"
      type="addservice"
    />
    <g-member-dialog
      v-model="userUpdateDialog"
      type="updateuser"
      :name="memberName"
      :is-current-user="isCurrentUser(memberName)"
      :roles="memberRoles"
    />
    <g-member-dialog
      v-model="serviceAccountUpdateDialog"
      type="updateservice"
      :name="memberName"
      :description="serviceAccountDescription"
      :is-current-user="isCurrentUser(memberName)"
      :roles="memberRoles"
      :orphaned="orphaned"
    />
    <g-member-help-dialog
      v-model="serviceAccountHelpDialog"
      type="service"
    />
    <g-member-help-dialog
      v-model="userHelpDialog"
      type="user"
    />
    <g-confirm-dialog ref="confirmDialog" />

    <v-dialog
      v-model="kubeconfigDialog"
      persistent
      max-width="67%"
    >
      <v-card>
        <v-card-title class="bg-toolbar-background text-toolbar-title d-flex">
          <div class="text-h5">
            Kubeconfig <code class="bg-toolbar-background-lighten-1">{{ currentServiceAccountDisplayName }}</code>
          </div>
          <v-spacer />
          <g-action-button
            icon="mdi-close"
            color="toolbar-title"
            @click="kubeconfigDialog = false"
          />
        </v-card-title>
        <v-card-text>
          <g-code-block
            lang="yaml"
            :content="currentServiceAccountKubeconfig"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import {
  ref,
  computed,
  inject,
  watch,
} from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import download from 'downloadjs'

import { useAuthzStore } from '@/store/authz'
import { useProjectStore } from '@/store/project'
import { useAuthnStore } from '@/store/authn'
import { useMemberStore } from '@/store/member'
import { useAppStore } from '@/store/app'
import { useLocalStorageStore } from '@/store/localStorage'

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
import GDataTableFooter from '@/components/GDataTableFooter.vue'

import { useApi } from '@/composables/useApi'
import { useProvideProjectItem } from '@/composables/useProjectItem'
import { useTwoTableLayout } from '@/composables/useTwoTableLayout'

import {
  displayName,
  isEmail,
  parseServiceAccountUsername,
  isForeignServiceAccount,
  isServiceAccountUsername,
  sortedRoleDescriptors,
  mapTableHeader,
} from '@/utils'

import toLower from 'lodash/toLower'
import orderBy from 'lodash/orderBy'
import mapValues from 'lodash/mapValues'
import mapKeys from 'lodash/mapKeys'
import map from 'lodash/map'
import join from 'lodash/join'
import includes from 'lodash/includes'
import head from 'lodash/head'
import get from 'lodash/get'
import forEach from 'lodash/forEach'
import filter from 'lodash/filter'

const renderComponent = inject('renderComponent')

const api = useApi()
const router = useRouter()
const projectStore = useProjectStore()
const authzStore = useAuthzStore()
const authnStore = useAuthnStore()
const memberStore = useMemberStore()
const appStore = useAppStore()
const localStorageStore = useLocalStorageStore()

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
  project,
  projectsNotMarkedForDeletion,
} = storeToRefs(projectStore)
const {
  namespace,
  canManageMembers,
  canManageServiceAccountMembers,
  canCreateServiceAccounts,
} = storeToRefs(authzStore)
const {
  username: currentUsername,
  isAdmin,
} = storeToRefs(authnStore)
const { list: memberList } = storeToRefs(memberStore)
const {
  userSelectedColumns,
  userSortBy,
  serviceAccountSelectedColumns,
  serviceAccountSortBy,
} = storeToRefs(localStorageStore)

const {
  projectNameAndTitle,
  projectOwner: owner,
} = useProvideProjectItem(project)

const confirmDialog = ref(null)

const userSortedList = computed(() => {
  const secondSortCriteria = 'username'
  return sortItems(userList, userSortBy, secondSortCriteria)
})

const userList = computed(() => {
  const users = filter(memberList.value, ({ username }) => !isServiceAccountUsername(username))
  return map(users, user => {
    const { username } = user
    return {
      ...user,
      displayName: displayName(username),
      isEmail: isEmail(username),
      isOwner: isOwner(username),
      roleDescriptors: sortedRoleDescriptors(user.roles),
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
      key: 'username',
      sortable: true,
      defaultSelected: true,
    },
    {
      title: 'ROLES',
      align: 'end',
      key: 'roles',
      sortable: true,
      defaultSelected: true,
    },
    {
      title: 'ACTIONS',
      align: 'end',
      key: 'actions',
      sortable: false,
      defaultSelected: true,
    },
  ]
  return map(headers, header => ({
    ...header,
    class: 'nowrap',
    selected: get(userSelectedColumns.value, header.key, header.defaultSelected),
  }))
})

const visibleUserAccountTableHeaders = computed(() => {
  return filter(userAccountTableHeaders.value, ['selected', true])
})

const serviceAccountSortedList = computed(() => {
  const secondSortCriteria = 'username'
  return sortItems(serviceAccountList, userSortBy, secondSortCriteria)
})

const serviceAccountList = computed(() => {
  const serviceAccounts = filter(memberList.value, ({ username }) => isServiceAccountUsername(username))
  return map(serviceAccounts, serviceAccount => {
    const { username } = serviceAccount
    return {
      ...serviceAccount,
      displayName: displayName(username),
      roleDescriptors: sortedRoleDescriptors(serviceAccount.roles),
      isCurrentUser: isCurrentUser(username),
    }
  })
})

const currentServiceAccountDisplayName = computed(() => {
  return get(parseServiceAccountUsername(currentServiceAccountName.value), ['name'])
})

const serviceAccountTableHeaders = computed(() => {
  const headers = [
    {
      title: 'NAME',
      align: 'start',
      key: 'displayName',
      sortable: true,
      defaultSelected: true,
    },
    {
      title: 'CREATED BY',
      align: 'start',
      key: 'createdBy',
      sortable: true,
      defaultSelected: true,
    },
    {
      title: 'CREATED AT',
      align: 'start',
      key: 'creationTimestamp',
      sortable: true,
      defaultSelected: true,
    },
    {
      title: 'DESCRIPTION',
      align: 'start',
      key: 'description',
      sortable: true,
      defaultSelected: true,
    },
    {
      title: 'ROLES',
      align: 'end',
      key: 'roles',
      sortable: true,
      defaultSelected: true,
    },
    {
      title: 'ACTIONS',
      align: 'end',
      key: 'actions',
      sortable: false,
      defaultSelected: true,
    },
  ]
  return map(headers, header => ({
    ...header,
    class: 'nowrap',
    selected: get(serviceAccountSelectedColumns.value, header.key, header.defaultSelected),
  }))
})

const visibleServiceAccountTableHeaders = computed(() => {
  return filter(serviceAccountTableHeaders.value, ['selected', true])
})

const itemHeight = 48
const firstTableItemCount = computed(() => userList.value.length)
const secondTableItemCount = computed(() => serviceAccountList.value.length)

const {
  firstTableStyles: userTableStyles,
  secondTableStyles: serviceAccountTableStyles,
} = useTwoTableLayout({
  firstTableItemCount,
  secondTableItemCount,
  itemHeight,
})

watch(namespace, () => {
  reset()
})

function reset () {
  userFilter.value = ''
  serviceAccountFilter.value = ''
}

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
    if (projectsNotMarkedForDeletion.value.length > 0) {
      const project = projectsNotMarkedForDeletion.value[0]
      const namespace = project.spec.namespace
      await router.push({ name: 'ShootList', params: { namespace } })
    } else {
      await router.push({ name: 'Home', params: {} })
    }
  }
}

function confirmRemoveUser (name) {
  let message
  if (isCurrentUser(name)) {
    message = renderComponent(GRemoveProjectMember, {
      projectNameAndTitle: projectNameAndTitle.value,
    })
  } else {
    message = renderComponent(GRemoveProjectMember, {
      projectNameAndTitle: projectNameAndTitle.value,
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
  const { namespace, name } = parseServiceAccountUsername(serviceAccountName)
  const message = renderComponent(GRemoveProjectMember, {
    projectNameAndTitle: projectNameAndTitle.value,
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

function sortItems (items, sortByArr, secondSortCriteria) {
  const sortByObj = head(sortByArr.value)
  if (!sortByObj || !sortByObj.key) {
    return items.value
  }

  const sortBy = sortByObj.key
  const sortOrder = sortByObj.order
  return orderBy(items.value, [item => getSortVal(item, sortBy), secondSortCriteria], [sortOrder, 'asc'])
}

function setSelectedHeaderUserAccount (header) {
  userSelectedColumns.value[header.key] = !header.selected
}

function resetTableSettingsUserAccount () {
  userSelectedColumns.value = mapTableHeader(userAccountTableHeaders.value, 'defaultSelected')
  userSortBy.value = [{ key: 'username', order: 'asc' }]
}

function setSelectedHeaderServiceAccount (header) {
  serviceAccountSelectedColumns.value[header.key] = !header.selected
}

function resetTableSettingsServiceAccount () {
  serviceAccountSelectedColumns.value = mapTableHeader(serviceAccountTableHeaders.value, 'defaultSelected')
  serviceAccountSortBy.value = [{ key: 'displayName', order: 'asc' }]
}

function disableCustomKeySort (tableHeaders) {
  const sortableTableHeaders = filter(tableHeaders.value, ['sortable', true])
  const tableKeys = mapKeys(sortableTableHeaders, ({ key }) => key)
  return mapValues(tableKeys, () => () => 0)
}

</script>

<style lang="scss" scoped>

.container-size {
  height: 100%;
  min-height: 800px; //ensure readability on small devices
}

</style>
