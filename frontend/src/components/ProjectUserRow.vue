<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
    <v-list-tile
      avatar
      :key="username"
    >
      <v-list-tile-avatar>
        <img :src="avatarUrl" />
      </v-list-tile-avatar>
      <v-list-tile-content>
        <v-list-tile-title>
          {{displayName}}
          <span v-if="isCurrentUser">(me)</span>
        </v-list-tile-title>
        <v-list-tile-sub-title>
          <a v-if="isEmail" :href="`mailto:${username}`" class="cyan--text text--darken-2">{{username}}</a>
          <span v-else>{{username}}</span>
        </v-list-tile-sub-title>
      </v-list-tile-content>
      <v-list-tile-action>
        <v-layout row align-center>
          <v-chip v-for="roleName in roleDisplayNames" :key="roleName" small color="black" outline>
            {{roleName}}
          </v-chip>
        </v-layout>
      </v-list-tile-action>
      <v-list-tile-action v-if="canPatchProject">
        <v-tooltip top>
          <v-btn slot="activator" icon class="black--text" @click.native.stop="onEdit">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
          <span>Update User</span>
        </v-tooltip>
      </v-list-tile-action>
      <v-list-tile-action v-if="canPatchProject">
        <v-tooltip top>
          <v-btn :disabled="isTechnicalContact" slot="activator" icon class="red--text" @click.native.stop="onDelete">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
          <span v-if="isTechnicalContact">This user is set as technical contact</span>
          <span v-else>Delete User</span>
        </v-tooltip>
      </v-list-tile-action>
    </v-list-tile>
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
    isTechnicalContact: {
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
      'canPatchProject'
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
