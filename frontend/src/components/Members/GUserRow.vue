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
    <td v-if="selectedHeaders.actions" class="text-action-button">
      <div class="d-flex justify-end">
        <div v-if="canManageMembers" class="ml-1">
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
            <span>Edit User Roles</span>
          </v-tooltip>
        </div>
        <div v-if="canManageMembers" class="ml-1">
          <v-tooltip location="top">
            <template v-slot:activator="{ props }">
              <div v-bind="props">
                <v-btn
                  density="compact"
                  variant="text"
                  :disabled="item.isOwner"
                  icon="mdi-close"
                  color="action-button"
                  @click.stop="onDelete"
                />
              </div>
            </template>
            <span v-if="item.isOwner">You can't remove project owners from the project. You can change the project owner on the administration page.</span>
            <span v-else>Remove User From Project</span>
          </v-tooltip>
        </div>
      </div>
    </td>
  </tr>
</template>

<script setup>
import { computed, toRef, toRefs, onMounted } from 'vue'
import GAccountRoles from '@/components/Members/GAccountRoles.vue'
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
