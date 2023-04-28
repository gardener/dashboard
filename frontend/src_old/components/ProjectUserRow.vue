<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <tr>
    <td v-if="selectedHeaders.username">
      <v-list-item class="pl-0">
        <v-list-item-avatar><img :src="item.avatarUrl" :alt="`avatar of ${item.username}`"/></v-list-item-avatar>
        <v-list-item-content>
          <v-list-item-title>{{item.displayName}}</v-list-item-title>
          <v-list-item-subtitle>
            <a v-if="item.isEmail" :href="`mailto:${item.username}`">{{item.username}}</a>
            <span v-else>{{item.username}}</span>
          </v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
    </td>
    <td v-if="selectedHeaders.roles">
      <div class="d-flex justify-end">
        <member-account-roles :role-display-names="item.roleDisplayNames"></member-account-roles>
      </div>
    </td>
    <td v-if="selectedHeaders.actions">
      <div class="d-flex flex-row justify-end mr-n2">
        <div v-if="canManageMembers" class="ml-1">
          <v-tooltip location="top">
            <template v-slot:activator="{ on }">
              <v-btn v-on="on" color="action-button"  icon @click.stop="onEdit">
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
            </template>
            <span>Edit User Roles</span>
          </v-tooltip>
        </div>
        <div v-if="canManageMembers" class="ml-1">
          <v-tooltip location="top">
            <template v-slot:activator="{ on }">
              <div v-on="on">
                <v-btn :disabled="item.isOwner" icon color="action-button" @click.stop="onDelete">
                  <v-icon>mdi-close</v-icon>
                </v-btn>
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

<script>
import { mapGetters } from 'vuex'
import MemberAccountRoles from '@/components/MemberAccountRoles.vue'
import { mapTableHeader } from '@/utils'

export default {
  name: 'project-user-row',
  components: {
    MemberAccountRoles
  },
  props: {
    item: {
      type: Object,
      required: true
    },
    headers: {
      type: Array,
      required: true
    }
  },
  computed: {
    ...mapGetters([
      'canManageMembers'
    ]),
    selectedHeaders () {
      return mapTableHeader(this.headers, 'selected')
    }
  },
  methods: {
    onDelete () {
      this.$emit('delete', this.item)
    },
    onEdit () {
      this.$emit('edit', this.item)
    }
  }
}
</script>
