<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <tr>
    <td class="pa-0" v-if="selectedHeaders.displayName">
      <v-list-item
        :prepend-avatar="item.avatarUrl"
      >
        <v-list-item-title class="d-flex align-center">
          <span class="text-subtitle-1">{{ item.displayName }}</span>
          <v-tooltip location="top" v-if="foreign">
            <template v-slot:activator="{ props }">
              <v-icon v-bind="props" size="small" class="ml-1">mdi-account-arrow-left</v-icon>
            </template>
            <span>Service Account invited from namespace {{ serviceAccountNamespace }}</span>
          </v-tooltip>
          <v-tooltip location="top" v-if="orphaned">
            <template v-slot:activator="{ props }">
              <v-icon v-bind="props" size="small" class="ml-1" color="warning">mdi-alert-circle-outline</v-icon>
            </template>
            <span>Associated Service Account does not exists</span>
          </v-tooltip>
        </v-list-item-title>
        <v-list-item-subtitle>{{ item.username }}</v-list-item-subtitle>
      </v-list-item>
    </td>
    <td v-if="selectedHeaders.createdBy">
      <g-account-avatar :account-name="item.createdBy" :size="16"></g-account-avatar>
    </td>
    <td v-if="selectedHeaders.creationTimestamp">
      <div>
        <g-time-string v-if="item.creationTimestamp" :date-time="item.creationTimestamp" mode="past"></g-time-string>
        <span v-else class="font-weight-light text-disabled">unknown</span>
      </div>
    </td>
    <td v-if="selectedHeaders.description">
      <div class="description-column">
        <span v-if="item.description">{{ item.description }}</span>
        <span v-else class="font-weight-light text-disabled">not defined</span>
      </div>
    </td>
    <td v-if="selectedHeaders.roles">
      <div class="d-flex justify-end">
        <g-account-roles :role-display-names="item.roleDisplayNames"></g-account-roles>
      </div>
    </td>
    <td v-if="selectedHeaders.actions" class="text-action-button">
      <div class="d-flex justify-end">
        <div v-if="!foreign && canCreateTokenRequest" class="ml-1">
          <v-tooltip location="top">
            <template v-slot:activator="{ props }">
              <v-btn
                v-bind="props"
                density="compact"
                variant="text"
                icon="mdi-download"
                @click.stop="onDownload"
                :disabled="orphaned"
              />
            </template>
            <span>Download Kubeconfig</span>
          </v-tooltip>
        </div>
        <div v-if="!foreign && canCreateTokenRequest" class="ml-1">
          <v-tooltip location="top">
            <template v-slot:activator="{ props }">
              <v-btn
                v-bind="props"
                density="compact"
                variant="text"
                icon="mdi-eye"
                @click="onKubeconfig"
                :disabled="orphaned"
              />
            </template>
            <span>Show Kubeconfig</span>
          </v-tooltip>
        </div>
        <div v-if="!foreign && canDeleteServiceAccounts && canCreateServiceAccounts" class="ml-1">
          <v-tooltip location="top">
            <template v-slot:activator="{ props }">
              <v-btn
                v-bind="props"
                density="compact"
                variant="text"
                icon="mdi-refresh"
                @click="onResetServiceAccount"
              />
            </template>
            <span>Reset Service Account</span>
          </v-tooltip>
        </div>
        <div v-if="canManageServiceAccountMembers" class="ml-1">
          <v-tooltip location="top">
            <template v-slot:activator="{ props }">
              <v-btn
                v-bind="props"
                density="compact"
                variant="text"
                icon="mdi-pencil"
                @click.stop="onEdit"
              />
            </template>
            <span>Edit Service Account</span>
          </v-tooltip>
        </div>
        <div v-if="canManageServiceAccountMembers && canDeleteServiceAccounts" class="ml-1">
          <v-tooltip location="top">
            <template v-slot:activator="{ props }">
               <div v-bind="props">
                <v-btn
                  :icon="foreign || orphaned ? 'mdi-close' : 'mdi-delete'"
                  density="compact"
                  variant="text"
                  @click.stop="onDelete"
                  :disabled="!canDelete"
                />
               </div>
            </template>
            <span>{{ deleteTooltip }}</span>
          </v-tooltip>
        </div>
      </div>
    </td>
  </tr>
</template>

<script setup>
import { computed, toRef, toRefs } from 'vue'
import GAccountAvatar from '@/components/GAccountAvatar.vue'
import GAccountRoles from '@/components/Members/GAccountRoles.vue'
import GTimeString from '@/components/GTimeString.vue'
import {
  isForeignServiceAccount,
  parseServiceAccountUsername,
  mapTableHeader,
} from '@/utils'

import {
  useProjectStore,
  useAuthzStore,
} from '@/store'

const projectStore = useProjectStore()
const authzStore = useAuthzStore()

const namespace = toRef(projectStore, 'namespace')

const canManageServiceAccountMembers = toRef(authzStore, 'canManageServiceAccountMembers')
const canCreateServiceAccounts = toRef(authzStore, 'canCreateServiceAccounts')
const canDeleteServiceAccounts = toRef(authzStore, 'canDeleteServiceAccounts')
const canCreateTokenRequest = toRef(authzStore, 'canCreateTokenRequest')

// props
const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  headers: {
    type: Array,
    required: true,
  },
})

const { item, headers } = toRefs(props)

// emits
const emit = defineEmits([
  'download',
  'kubeconfig',
  'reset-serviceaccount',
  'edit',
  'delete',
])

// computed
const orphaned = computed(() => {
  return item.value.orphaned
})

const foreign = computed(() => {
  return isForeignServiceAccount(namespace.value, item.value.username)
})

const canDelete = computed(() => {
  return foreign.value || orphaned.value || !item.value.deletionTimestamp
})

const deleteTooltip = computed(() => {
  if (!canDelete.value) {
    return 'Service Account is already marked for deletion'
  }
  if (orphaned.value) {
    return 'Remove Service Account from Project'
  }
  if (foreign.value) {
    return 'Remove foreign Service Account from Project'
  }
  return 'Delete Service Account'
})

const createdByClasses = computed(() => {
  return item.value.createdBy ? ['font-weight-bold'] : ['grey--text']
})

const serviceAccountNamespace = computed(() => {
  const { namespace } = parseServiceAccountUsername(item.value.username)
  return namespace
})

const selectedHeaders = computed(() => {
  return mapTableHeader(headers.value, 'selected')
})

// methods
function onDownload () {
  emit('download', item.value)
}

function onKubeconfig () {
  emit('kubeconfig', item.value)
}

function onResetServiceAccount () {
  emit('reset-serviceaccount', item.value)
}

function onEdit () {
  emit('edit', item.value)
}

function onDelete () {
  emit('delete', item.value)
}

</script>

<style lang="scss" scoped>
.description-column {
  max-width: 20vw;
  max-height: 60px;
  overflow: auto;
}
</style>
