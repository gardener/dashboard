<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <tr>
    <td class="pa-0" v-if="selectedHeaders.username">
      <v-list-item
        :prepend-avatar="item.avatarUrl"
      >
        <v-list-item-title>{{ item.displayName }}</v-list-item-title>
        <v-list-item-subtitle>
          <a v-if="item.isEmail" :href="`mailto:${item.username}`">{{ item.username }}</a>
          <span v-else>{{ item.username }}</span>
        </v-list-item-subtitle>
      </v-list-item>
    </td>
    <td v-if="selectedHeaders.roles">
      <div class="d-flex justify-end">
        <g-account-roles :role-display-names="item.roleDisplayNames"></g-account-roles>
      </div>
    </td>
    <td v-if="selectedHeaders.actions">
      <div class="d-flex justify-end">
        <div v-if="canManageMembers" class="ml-1">
          <g-action-button
            icon="mdi-pencil"
            @click="onEdit"
          >
            <template #tooltip>
              <span>Edit User Roles</span>
            </template>
          </g-action-button>
        </div>
        <div v-if="canManageMembers" class="ml-1">
          <g-action-button
            icon="mdi-close"
            :disabled="item.isOwner"
            @click="onDelete"
          >
            <template #tooltip>
              <span v-if="item.isOwner">You can't remove project owners from the project. You can change the project owner on the administration page.</span>
              <span v-else>Remove User From Project</span>
            </template>
          </g-action-button>
        </div>
      </div>
    </td>
  </tr>
</template>

<script setup>
import { computed, toRef, toRefs } from 'vue'
import GAccountRoles from '@/components/Members/GAccountRoles.vue'
import GActionButton from '@/components/GActionButton.vue'
import { mapTableHeader } from '@/utils'

import {
  useAuthzStore,
} from '@/store'

const authzStore = useAuthzStore()

const canManageMembers = toRef(authzStore, 'canManageMembers')

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
  'edit',
  'delete',
])

const selectedHeaders = computed(() => {
  return mapTableHeader(headers.value, 'selected')
})

function onEdit () {
  emit('edit', item.value)
}

function onDelete () {
  emit('delete', item.value)
}

</script>
