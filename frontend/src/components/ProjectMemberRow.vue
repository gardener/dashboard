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
    <v-divider v-if="!firstRow" inset></v-divider>
    <v-list-tile
      avatar
      :key="member.username"
    >
      <v-list-tile-avatar>
        <img :src="member.avatarUrl" />
      </v-list-tile-avatar>
      <v-list-tile-content>
        <v-list-tile-title>
          {{member.displayName}}
        </v-list-tile-title>
        <v-list-tile-sub-title>
          <a v-if="member.isEmail" :href="`mailto:${member.username}`" class="green--text text--darken-2">{{member.username}}</a>
          <span v-else class="pl-2">{{member.username}}</span>
        </v-list-tile-sub-title>
      </v-list-tile-content>
      <v-list-tile-action>
        <v-layout row align-center>
          <v-chip v-for="(roleName, index) in member.roleNames" :key="index" small color="green darken-2" text-color="white">
            {{roleName}}
          </v-chip>
        </v-layout>
      </v-list-tile-action>
      <v-list-tile-action>
        <v-tooltip top>
          <v-btn slot="activator" icon class="green--text text--darken-2" @click.native.stop="onEdit">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
          <span>Configure Member</span>
        </v-tooltip>
      </v-list-tile-action>
      <v-list-tile-action>
        <v-tooltip top>
          <v-btn :disabled="member.isTechnicalOrBillingContact" slot="activator" icon class="red--text" @click.native.stop="onDelete">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
          <span v-if="member.isTechnicalOrBillingContact">This member is set as technical or billing contact</span>
          <span v-else>Delete Member</span>
        </v-tooltip>
      </v-list-tile-action>
    </v-list-tile>
  </div>
</template>

<script>
export default {
  name: 'project-member-row',
  props: {
    member: {
      type: Object,
      required: true
    },
    firstRow: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    onDelete (username) {
      this.$emit('onDelete', this.member.username)
    },
    onEdit (username) {
      this.$emit('onEdit', this.member.username, this.member.roles)
    }
  }
}
</script>

<style lang="styl" scoped>
  .cursor-pointer {
    cursor: pointer;
  }
</style>
