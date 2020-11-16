<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <tr>
    <td>
      <v-list-item>
        <v-list-item-avatar><img :src="item.avatarUrl" /></v-list-item-avatar>
        <v-list-item-content>
          <v-list-item-title>{{item.displayName}}</v-list-item-title>
          <v-list-item-subtitle>
            <a v-if="item.isEmail" :href="`mailto:${item.username}`" class="cyan--text text--darken-2">{{item.username}}</a>
            <span v-else>{{item.username}}</span>
          </v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
    </td>
    <td>
      <div class="d-flex justify-end">
        <member-account-roles :role-display-names="item.roleDisplayNames"></member-account-roles>
      </div>
    </td>
    <td width="250px">
      <div class="d-flex flex-row justify-end">
        <div v-if="canManageMembers" class="ml-1">
          <v-tooltip top>
            <template v-slot:activator="{ on }">
              <v-btn v-on="on" icon @click.native.stop="onEdit">
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
            </template>
            <span>Change User Roles</span>
          </v-tooltip>
        </div>
        <div v-if="canManageMembers" class="ml-1">
          <v-tooltip top>
            <template v-slot:activator="{ on }">
              <div v-on="on">
                <v-btn :disabled="item.isOwner" icon color="red" @click.native.stop="onDelete">
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
import MemberAccountRoles from '@/components/MemberAccountRoles'

export default {
  name: 'project-user-row',
  components: {
    MemberAccountRoles
  },
  props: {
    item: {
      required: true
    }
  },
  computed: {
    ...mapGetters([
      'canManageMembers'
    ])
  },
  methods: {
    onDelete (username) {
      this.$emit('delete', this.item.username)
    },
    onEdit (username) {
      this.$emit('edit', this.item.username, this.item.roles)
    }
  }
}
</script>

<style lang="scss" scoped>
  .cursor-pointer {
    cursor: pointer;
  }
</style>
