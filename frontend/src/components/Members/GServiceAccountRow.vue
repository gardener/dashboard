<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <tr>
    <td
      v-if="selectedHeaders.displayName"
      class="pa-0"
    >
      <v-list
        class="pa-0"
        density="compact"
      >
        <v-list-item
          :prepend-avatar="item.avatarUrl"
        >
          <v-list-item-title>
            {{ item.displayName }}
            <v-icon
              v-if="foreign"
              v-tooltip:top="`Service Account invited from namespace ${serviceAccountNamespace}`"
              icon="mdi-account-arrow-left"
              end
              size="small"
              color="medium-emphasis"
            />
            <v-icon
              v-if="orphaned"
              v-tooltip:top="'Associated Service Account does not exist'"
              icon="mdi-alert-circle-outline"
              end
              size="small"
              color="warning"
            />
          </v-list-item-title>
          <v-list-item-subtitle>
            {{ item.username }}
          </v-list-item-subtitle>
        </v-list-item>
      </v-list>
    </td>
    <td v-if="selectedHeaders.createdBy">
      <g-account-avatar
        :account-name="item.createdBy"
        :size="16"
      />
    </td>
    <td v-if="selectedHeaders.creationTimestamp">
      <div>
        <g-time-string
          v-if="item.creationTimestamp"
          :date-time="item.creationTimestamp"
          mode="past"
        />
        <span
          v-else
          class="font-weight-light text-disabled"
        >unknown</span>
      </div>
    </td>
    <td v-if="selectedHeaders.description">
      <g-scroll-container class="description-column">
        <span v-if="item.description">{{ item.description }}</span>
        <span
          v-else
          class="font-weight-light text-disabled"
        >not defined</span>
      </g-scroll-container>
    </td>
    <td v-if="selectedHeaders.roles">
      <g-scroll-container class="d-flex flex-wrap justify-end roles-column">
        <g-account-roles :role-display-names="item.roleDisplayNames" />
      </g-scroll-container>
    </td>
    <td v-if="selectedHeaders.actions">
      <div class="d-flex justify-end">
        <div
          v-if="!foreign && canCreateTokenRequest"
          class="ml-1"
        >
          <g-action-button
            icon="mdi-download"
            :disabled="orphaned"
            @click="onDownload"
          >
            <template #tooltip>
              <span>Download Kubeconfig</span>
            </template>
          </g-action-button>
        </div>
        <div
          v-if="!foreign && canCreateTokenRequest"
          class="ml-1"
        >
          <g-action-button
            icon="mdi-eye"
            :disabled="orphaned"
            @click="onKubeconfig"
          >
            <template #tooltip>
              <span>Show Kubeconfig</span>
            </template>
          </g-action-button>
        </div>
        <div
          v-if="!foreign && canDeleteServiceAccounts && canCreateServiceAccounts"
          class="ml-1"
        >
          <g-action-button
            icon="mdi-refresh"
            @click="onResetServiceAccount"
          >
            <template #tooltip>
              <span>Reset Service Account</span>
            </template>
          </g-action-button>
        </div>
        <div
          v-if="canManageServiceAccountMembers"
          class="ml-1"
        >
          <g-action-button
            icon="mdi-pencil"
            @click="onEdit"
          >
            <template #tooltip>
              <span>Edit Service Account</span>
            </template>
          </g-action-button>
        </div>
        <div
          v-if="canManageServiceAccountMembers && canDeleteServiceAccounts"
          class="ml-1"
        >
          <g-action-button
            :icon="foreign || orphaned ? 'mdi-close' : 'mdi-delete'"
            :disabled="!canDelete"
            @click="onDelete"
          >
            <template #tooltip>
              <span>{{ deleteTooltip }}</span>
            </template>
          </g-action-button>
        </div>
      </div>
    </td>
  </tr>
</template>

<script setup>
import {
  computed,
  toRef,
  toRefs,
} from 'vue'

import { useAuthzStore } from '@/store/authz'

import GAccountAvatar from '@/components/GAccountAvatar.vue'
import GAccountRoles from '@/components/Members/GAccountRoles.vue'
import GTimeString from '@/components/GTimeString.vue'
import GActionButton from '@/components/GActionButton.vue'
import GScrollContainer from '@/components/GScrollContainer'

import {
  isForeignServiceAccount,
  parseServiceAccountUsername,
  mapTableHeader,
} from '@/utils'

const authzStore = useAuthzStore()

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
  'resetServiceaccount',
  'edit',
  'delete',
])

// computed
const orphaned = computed(() => {
  return item.value.orphaned
})

const foreign = computed(() => {
  return isForeignServiceAccount(authzStore.namespace, item.value.username)
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
  emit('resetServiceaccount', item.value)
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

.roles-column {
  max-width: 200px;
  max-height: 60px;
  overflow: auto;
}
</style>
