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
    <v-list-tile avatar>
      <v-list-tile-avatar>
        <img :src="avatarUrl" />
      </v-list-tile-avatar>
      <v-list-tile-content>
        <g-popper
          :title="displayName"
          toolbarColor="cyan darken-2"
          :popperKey="`serviceAccount_sa_${username}`"

        >
          <v-list-tile-title slot="popperRef" class="cursor-pointer">
            {{displayName}}
          </v-list-tile-title>
          <v-layout row
            fill-height
            align-center
          >
            <span class="mr-2">Created by</span><span :class="createdByClasses"><account-avatar :account-name="createdBy"></account-avatar></span>
          </v-layout>
          <v-layout row
            fill-height
            align-center
            v-if="created && creationTimestamp"
          >
            <span class="mr-3">Created</span>
            <v-tooltip top>
              <span slot="activator" class="font-weight-bold"><time-string :date-time="creationTimestamp" :pointInTime="-1"></time-string></span>
              {{created}}
            </v-tooltip>
          </v-layout>
        </g-popper>
        <v-list-tile-sub-title>
          {{username}}
        </v-list-tile-sub-title>
      </v-list-tile-content>
      <v-list-tile-action>
        <v-layout row align-center>
          <v-chip v-for="roleName in roleDisplayNames" :key="roleName" small color="blue-grey darken-2" text-color="white">
            {{roleName}}
          </v-chip>
        </v-layout>
      </v-list-tile-action>
      <v-list-tile-action v-if="isServiceAccountFromCurrentNamespace && canGetSecrets">
        <v-tooltip top>
          <v-btn slot="activator" icon class="blue-grey--text" @click.native.stop="onDownload">
            <v-icon>mdi-download</v-icon>
          </v-btn>
          <span>Download Kubeconfig</span>
        </v-tooltip>
      </v-list-tile-action>
      <v-list-tile-action v-if="isServiceAccountFromCurrentNamespace && canGetSecrets">
        <v-tooltip top>
          <v-btn slot="activator" small icon class="blue-grey--text" @click="onKubeconfig">
            <v-icon>visibility</v-icon>
          </v-btn>
          <span>Show Kubeconfig</span>
        </v-tooltip>
      </v-list-tile-action>
      <v-list-tile-action v-if="canPatchProject">
        <v-tooltip top>
          <v-btn slot="activator" icon class="blue-grey--text" @click.native.stop="onEdit">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
          <span>Update Service Account</span>
        </v-tooltip>
      </v-list-tile-action>
      <v-list-tile-action v-if="canPatchProject">
        <v-tooltip top>
          <v-btn slot="activator" icon class="red--text" @click.native.stop="onDelete">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
          <span>Delete Service Account</span>
        </v-tooltip>
      </v-list-tile-action>
    </v-list-tile>
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

<style lang="styl" scoped>
  .cursor-pointer {
    cursor: pointer;
  }
</style>
