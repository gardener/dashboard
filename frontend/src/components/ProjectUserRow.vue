<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 -->

<template>
  <div>
    <v-list-item :key="username">
      <v-list-item-avatar>
        <img :src="avatarUrl" />
      </v-list-item-avatar>
      <v-list-item-content>
        <v-list-item-title>
          {{displayName}}
          <span v-if="isCurrentUser">(me)</span>
        </v-list-item-title>
        <v-list-item-subtitle>
          <a v-if="isEmail" :href="`mailto:${username}`" class="cyan--text text--darken-2">{{username}}</a>
          <span v-else>{{username}}</span>
        </v-list-item-subtitle>
      </v-list-item-content>
      <v-list-item-action class="ml-1">
        <div d-flex flex-row>
          <v-tooltip top v-for="{ displayName, notEditable, tooltip } in roleDisplayNames" :key="displayName" :disabled="!tooltip">
            <template v-slot:activator="{ on }">
              <v-chip v-on="on" class="mr-3" small :color="notEditable ? 'grey' : 'black'" outlined>
                {{displayName}}
              </v-chip>
            </template>
            <span>{{tooltip}}</span>
          </v-tooltip>
        </div>
      </v-list-item-action>
      <v-list-item-action v-if="canManageMembers" class="ml-1">
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon @click.native.stop="onEdit">
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
          </template>
          <span>Change user roles</span>
        </v-tooltip>
      </v-list-item-action>
      <v-list-item-action v-if="canManageMembers" class="ml-1">
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <div v-on="on">
              <v-btn :disabled="isowner" icon color="red" @click.native.stop="onDelete">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </div>
          </template>
          <span v-if="isowner">You can't remove project owners from the project. You can change the project owner on the administration page.</span>
          <span v-else>Remove user from project</span>
        </v-tooltip>
      </v-list-item-action>
    </v-list-item>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'project-user-row',
  props: {
    username: {
      type: String,
      required: true
    },
    avatarUrl: {
      type: String,
      required: true
    },
    displayName: {
      type: String,
      required: true
    },
    isEmail: {
      type: Boolean,
      required: true
    },
    isowner: {
      type: Boolean,
      required: true
    },
    roles: {
      type: Array,
      required: true
    },
    roleDisplayNames: {
      type: Array,
      required: true
    },
    isCurrentUser: {
      type: Boolean
    }
  },
  computed: {
    ...mapGetters([
      'canManageMembers'
    ])
  },
  methods: {
    onDelete (username) {
      this.$emit('delete', this.username)
    },
    onEdit (username) {
      this.$emit('edit', this.username, this.roles)
    }
  }
}
</script>

<style lang="scss" scoped>
  .cursor-pointer {
    cursor: pointer;
  }
</style>
