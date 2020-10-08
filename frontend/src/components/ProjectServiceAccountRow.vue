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
    <v-list-item>
      <v-list-item-avatar>
        <img :src="avatarUrl" />
      </v-list-item-avatar>
      <v-list-item-content>
        <v-list-item-title class="cursor-pointer">
          <g-popper
            :title="displayName"
            toolbarColor="cyan darken-2"
            :popperKey="`serviceAccount_sa_${username}`"
          >
            <template v-slot:popperRef>
              <span>{{displayName}}</span>
              <v-tooltip v-if="!isServiceAccountFromCurrentNamespace" top>
                <template v-slot:activator="{ on }">
                  <v-icon v-on="on" small class="ml-1">mdi-account-arrow-left</v-icon>
                </template>
                <span>Service Account invitewd from namespace {{serviceAccountNamespace}}</span>
              </v-tooltip>
            </template>
            <v-list class="pa-0">
              <v-list-item class="px-0">
                <v-list-item-content class="pt-1">
                  <v-list-item-subtitle>Created by</v-list-item-subtitle>
                  <v-list-item-title><account-avatar :account-name="createdBy"></account-avatar></v-list-item-title>
                </v-list-item-content>
              </v-list-item>
              <v-list-item class="px-0">
                <v-list-item-content class="pt-1">
                  <v-list-item-subtitle>Created</v-list-item-subtitle>
                  <v-list-item-title>
                    <v-tooltip top>
                      <template v-slot:activator="{ on }">
                        <span v-on="on">
                          <time-string :date-time="creationTimestamp" :pointInTime="-1"></time-string>
                        </span>
                      </template>
                      {{created}}
                    </v-tooltip>
                  </v-list-item-title>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </g-popper>
        </v-list-item-title>
        <v-list-item-subtitle>
          {{username}}
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
      <v-list-item-action v-if="isServiceAccountFromCurrentNamespace && canGetSecrets" class="ml-1">
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon @click.native.stop="onDownload">
              <v-icon>mdi-download</v-icon>
            </v-btn>
          </template>
          <span>Download Kubeconfig</span>
        </v-tooltip>
      </v-list-item-action>
      <v-list-item-action v-if="isServiceAccountFromCurrentNamespace && canGetSecrets" class="ml-1">
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon @click="onKubeconfig">
              <v-icon>visibility</v-icon>
            </v-btn>
          </template>
          <span>Show Kubeconfig</span>
        </v-tooltip>
      </v-list-item-action>
      <v-list-item-action v-if="canManageServiceAccountMembers" class="ml-1">
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon @click.native.stop="onEdit">
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
          </template>
          <span>Change service account roles</span>
        </v-tooltip>
      </v-list-item-action>
      <v-list-item-action v-if="canManageServiceAccountMembers" class="ml-1">
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon color="red" @click.native.stop="onDelete">
              <v-icon v-if="isServiceAccountFromCurrentNamespace">mdi-delete</v-icon>
              <v-icon v-else>mdi-close</v-icon>
            </v-btn>
          </template>
          <span v-if="isServiceAccountFromCurrentNamespace">Delete Service Account</span>
          <span v-else>Remove service account from project</span>
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
  isForeignServiceAccount,
  nameAndNamespaceFromServiceAccountUsername
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
      'canManageServiceAccountMembers',
      'canGetSecrets'
    ]),
    isServiceAccountFromCurrentNamespace () {
      return !isForeignServiceAccount(this.namespace, this.username)
    },
    createdByClasses () {
      return this.createdBy ? ['font-weight-bold'] : ['grey--text']
    },
    serviceAccountNamespace () {
      const { namespace } = nameAndNamespaceFromServiceAccountUsername(this.username)
      return namespace
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
  ::v-deep .popper {
    text-align: initial;
  }
</style>
