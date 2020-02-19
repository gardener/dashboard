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

<template^>
  <div>
    <v-divider v-if="!firstRow" inset></v-divider>
    <v-list-tile avatar>
      <v-list-tile-avatar>
        <img :src="serviceAccount.avatarUrl" />
      </v-list-tile-avatar>
      <v-list-tile-content>
        <g-popper
          :title="serviceAccount.displayName"
          toolbarColor="cyan darken-2"
          :popperKey="`serviceAccount_sa_${serviceAccount.username}`"

        >
          <v-list-tile-title slot="popperRef" class="cursor-pointer">
            {{serviceAccount.displayName}}
          </v-list-tile-title>
          <v-layout row
            fill-height
            align-center
          >
            <span class="mr-2">Created by</span><span :class="createdByClasses"><account-avatar :account-name="serviceAccount.createdBy"></account-avatar></span>
          </v-layout>
          <v-layout row
            fill-height
            align-center
          >
            <span class="mr-3">Created at</span>
            <v-tooltip top>
              <span slot="activator" class="font-weight-bold"><time-string :date-time="serviceAccount.creationTimestamp" :pointInTime="-1"></time-string></span>
              {{serviceAccount.created}}
            </v-tooltip>
          </v-layout>
        </g-popper>
        <v-list-tile-sub-title>
          {{serviceAccount.username}}
        </v-list-tile-sub-title>
      </v-list-tile-content>
      <v-list-tile-action>
        <v-layout row align-center>
          <v-chip v-for="(roleName, index) in serviceAccount.roleNames" :key="index" small color="blue-grey darken-2" text-color="white">
            {{roleName}}
          </v-chip>
        </v-layout>
      </v-list-tile-action>
      <v-list-tile-action v-if="isServiceAccountFromCurrentNamespace">
        <v-tooltip top>
          <v-btn slot="activator" icon class="blue-grey--text" @click.native.stop="onDownload">
            <v-icon>mdi-download</v-icon>
          </v-btn>
          <span>Download Kubeconfig</span>
        </v-tooltip>
      </v-list-tile-action>
      <v-list-tile-action v-if="isServiceAccountFromCurrentNamespace">
        <v-tooltip top>
          <v-btn slot="activator" small icon class="blue-grey--text" @click="onKubeconfig">
            <v-icon>visibility</v-icon>
          </v-btn>
          <span>Show Kubeconfig</span>
        </v-tooltip>
      </v-list-tile-action>
      <v-list-tile-action>
        <v-tooltip top>
          <v-btn slot="activator" icon class="blue-grey--text text--darken-2" @click.native.stop="onEdit">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
          <span>Configure Service Account</span>
        </v-tooltip>
      </v-list-tile-action>
      <v-list-tile-action>
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
import { mapState } from 'vuex'
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
    serviceAccount: {
      type: Object,
      required: true
    },
    firstRow: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    ...mapState([
      'namespace'
    ]),
    isServiceAccountFromCurrentNamespace () {
      return isServiceAccountFromNamespace(this.serviceAccount.username, this.namespace)
    },
    createdByClasses () {
      return !!this.createdBy ? ['font-weight-bold'] : ['grey--text']
    }
  },
  methods: {
    async onDownload () {
      this.$emit('onDownload', this.serviceAccount.username)
    },
    async onKubeconfig () {
      this.$emit('onKubeconfig', this.serviceAccount.username)
    },
    onEdit (username) {
      this.$emit('onEdit', this.serviceAccount.username, this.serviceAccount.roles)
    },
    onDelete (username) {
      this.$emit('onDelete', this.serviceAccount.username)
    }
  }
}
</script>

<style lang="styl" scoped>
  .cursor-pointer {
    cursor: pointer;
  }
</style>
