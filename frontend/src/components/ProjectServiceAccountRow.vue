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
    <v-list-item>
      <v-list-item-avatar>
        <img :src="avatarUrl" />
      </v-list-item-avatar>
      <v-list-item-content>
        <v-list-item-title class="cursor-pointer" stlye="max-width: 200px;">
          <g-popper
            :title="displayName"
            toolbarColor="cyan darken-2"
            :popperKey="`serviceAccount_sa_${username}`"

          >
            <span slot="popperRef">{{displayName}}</span>
            <v-row class="fill-height" align="center"
            >
              <span class="mr-2">Created by</span><span :class="createdByClasses">
                <account-avatar :account-name="createdBy"></account-avatar>
              </span>
            </v-row>
            <v-row class="fill-height" align="center"
              v-if="created && creationTimestamp"
            >
              <span class="mr-4">Created</span>
              <v-tooltip top>
                <template v-slot:activator="{ on }">
                  <span v-on="on" class="font-weight-bold">
                    <time-string :date-time="creationTimestamp" :pointInTime="-1"></time-string>
                  </span>
                </template>
                {{created}}
              </v-tooltip>
            </v-row>
          </g-popper>
        </v-list-item-title>
        <v-list-item-subtitle>
          {{username}}
        </v-list-item-subtitle>
      </v-list-item-content>
      <v-list-item-action class="ml-1">
        <v-row>
          <v-chip class="mr-3" v-for="roleName in roleDisplayNames" :key="roleName" small color="black" outlined>
            {{roleName}}
          </v-chip>
        </v-row>
      </v-list-item-action>
      <v-list-item-action v-if="isServiceAccountFromCurrentNamespace && canGetSecrets" class="ml-1">
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon class="black--text" @click.native.stop="onDownload">
              <v-icon>mdi-download</v-icon>
            </v-btn>
          </template>
          <span>Download Kubeconfig</span>
        </v-tooltip>
      </v-list-item-action>
      <v-list-item-action v-if="isServiceAccountFromCurrentNamespace && canGetSecrets" class="ml-1">
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" small icon class="black--text" @click="onKubeconfig">
              <v-icon>visibility</v-icon>
            </v-btn>
          </template>
          <span>Show Kubeconfig</span>
        </v-tooltip>
      </v-list-item-action>
      <v-list-item-action v-if="canPatchProject" class="ml-1">
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon class="black--text" @click.native.stop="onEdit">
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
          </template>
          <span>Update Service Account</span>
        </v-tooltip>
      </v-list-item-action>
      <v-list-item-action v-if="canPatchProject" class="ml-1">
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon class="red--text" @click.native.stop="onDelete">
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </template>
          <span>Delete Service Account</span>
        </v-tooltip>
      </v-list-item-action>
    </v-list-item>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import TimeString from '@/components/TimeString'
import GPopper from '@/components/GPopper'
import AccountAvatar from '@/components/AccountAvatar'
import {
  isServiceAccountFromNamespace
} from '@/utils'

export default {
  name: 'project-service-account-row',
  components: {
    TimeString,
    GPopper,
    AccountAvatar
  },
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
    createdBy: {
      type: String
    },
    creationTimestamp: {
      type: String
    },
    created: {
      type: String
    },
    roles: {
      type: Array,
      required: true
    },
    roleDisplayNames: {
      type: Array,
      required: true
    }
  },
  computed: {
    ...mapState([
      'namespace'
    ]),
    ...mapGetters([
      'canPatchProject',
      'canGetSecrets'
    ]),
    isServiceAccountFromCurrentNamespace () {
      return isServiceAccountFromNamespace(this.username, this.namespace)
    },
    createdByClasses () {
      return this.createdBy ? ['font-weight-bold'] : ['grey--text']
    }
  },
  methods: {
    onDownload () {
      this.$emit('download', this.username)
    },
    onKubeconfig () {
      this.$emit('kubeconfig', this.username)
    },
    onEdit (username) {
      this.$emit('edit', this.username, this.roles)
    },
    onDelete (username) {
      this.$emit('delete', this.username)
    }
  }
}
</script>

<style lang="scss" scoped>
  .cursor-pointer {
    cursor: pointer;
  }
</style>
