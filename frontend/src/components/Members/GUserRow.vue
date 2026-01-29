<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <tr>
    <td
      v-if="selectedHeaders.username"
      class="pa-0"
    >
      <v-list
        class="pa-0"
        density="compact"
      >
        <v-list-item>
          <template #prepend>
            <g-avatar
              :account-name="item.username"
            />
          </template>
          <v-list-item-title>
            {{ item.displayName }}
          </v-list-item-title>
          <v-list-item-subtitle :class="{ 'inherit-opacity': item.isEmail }">
            <a
              v-if="item.isEmail"
              :href="`mailto:${item.username}`"
              class="text-anchor"
            >{{ item.username }}</a>
            <span v-else>{{ item.username }}</span>
          </v-list-item-subtitle>
        </v-list-item>
      </v-list>
    </td>
    <td v-if="selectedHeaders.roles">
      <div class="d-flex justify-end">
        <g-account-roles :role-descriptors="item.roleDescriptors" />
      </div>
    </td>
    <td v-if="selectedHeaders.actions">
      <div class="d-flex justify-end">
        <div
          v-if="canManageMembers"
          class="ml-1"
        >
          <g-action-button
            icon="mdi-pencil"
            @click="onEdit"
          >
            <template #tooltip>
              <span>Edit User Roles</span>
            </template>
          </g-action-button>
        </div>
        <div
          v-if="canManageMembers"
          class="ml-1"
        >
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
import {
  computed,
  toRef,
  toRefs,
} from 'vue'

import { useAuthzStore } from '@/store/authz'

import GAccountRoles from '@/components/Members/GAccountRoles.vue'
import GActionButton from '@/components/GActionButton.vue'
import GAvatar from '@/components/GAvatar.vue'

import { mapTableHeader } from '@/utils'

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

const { item } = toRefs(props)

// emits
const emit = defineEmits([
  'edit',
  'delete',
])

const selectedHeaders = computed(() => {
  return mapTableHeader(props.headers, 'selected')
})

function onEdit () {
  emit('edit', item.value)
}

function onDelete () {
  emit('delete', item.value)
}

</script>
