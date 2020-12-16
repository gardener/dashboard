<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <tr>
    <td v-if="selectedHeaders.displayName">
      <v-list-item>
        <v-list-item-avatar><img :src="item.avatarUrl" /></v-list-item-avatar>
        <v-list-item-content>
          <v-list-item-title>
            <span class="subtitle-1">{{item.displayName}}</span>
            <v-tooltip top v-if="!isServiceAccountFromCurrentNamespace">
              <template v-slot:activator="{ on }">
                <v-icon v-on="on" small class="ml-1">mdi-account-arrow-left</v-icon>
              </template>
              <span>Service Account invited from namespace {{serviceAccountNamespace}}</span>
            </v-tooltip>
          </v-list-item-title>
          <v-list-item-subtitle>{{item.username}}</v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
    </td>
    <td v-if="selectedHeaders.createdBy">
      <account-avatar :account-name="item.createdBy" :size="16"></account-avatar>
    </td>
    <td v-if="selectedHeaders.creationTimestamp">
      <div>
        <v-tooltip top v-if="item.creationTimestamp">
          <template v-slot:activator="{ on }">
            <span v-on="on">
              <time-string :date-time="item.creationTimestamp" mode="past"></time-string>
            </span>
          </template>
          {{item.created}}
        </v-tooltip>
        <span v-else class="font-weight-light text--disabled">Unknown</span>
      </div>
    </td>
    <td v-if="selectedHeaders.description">
      <div class="description-column">
        <span v-if="item.description">{{item.description}}</span>
        <span v-else class="font-weight-light text--disabled">Not defined</span>
      </div>
    </td>
    <td v-if="selectedHeaders.roles">
      <div class="d-flex justify-end">
        <member-account-roles :role-display-names="item.roleDisplayNames"></member-account-roles>
      </div>
    </td>
    <td width="250px" v-if="selectedHeaders.actions">
      <div class="d-flex flex-row justify-end">
        <div v-if="isServiceAccountFromCurrentNamespace && canGetSecrets" class="ml-1">
          <v-tooltip top>
            <template v-slot:activator="{ on }">
              <v-btn v-on="on" icon @click.native.stop="onDownload">
                <v-icon>mdi-download</v-icon>
              </v-btn>
            </template>
            <span>Download Kubeconfig</span>
          </v-tooltip>
        </div>
        <div v-if="isServiceAccountFromCurrentNamespace && canGetSecrets" class="ml-1">
          <v-tooltip top>
            <template v-slot:activator="{ on }">
              <v-btn v-on="on" icon @click="onKubeconfig">
                <v-icon>mdi-eye</v-icon>
              </v-btn>
            </template>
            <span>Show Kubeconfig</span>
          </v-tooltip>
        </div>
        <div v-if="isServiceAccountFromCurrentNamespace && canDeleteSecrets" class="ml-1">
          <v-tooltip top>
            <template v-slot:activator="{ on }">
              <v-btn v-on="on" icon @click="onRotateSecret">
                <v-icon>mdi-refresh</v-icon>
              </v-btn>
            </template>
            <span>Rotate Service Account Secret</span>
          </v-tooltip>
        </div>
        <div v-if="canManageServiceAccountMembers" class="ml-1">
          <v-tooltip top>
            <template v-slot:activator="{ on }">
              <v-btn v-on="on" icon @click.native.stop="onEdit">
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
            </template>
            <span>Change Service Account</span>
          </v-tooltip>
        </div>
        <div v-if="canManageServiceAccountMembers" class="ml-1">
          <v-tooltip top>
            <template v-slot:activator="{ on }">
              <v-btn v-on="on" icon color="red" @click.native.stop="onDelete">
                <v-icon>{{ isServiceAccountFromCurrentNamespace ? 'mdi-delete' : 'mdi-close' }}</v-icon>
              </v-btn>
            </template>
            <span>{{ isServiceAccountFromCurrentNamespace ? 'Delete Service Account' : 'Remove Foreign Service Account from Project' }}</span>
          </v-tooltip>
        </div>
      </div>
    </td>
  </tr>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import TimeString from '@/components/TimeString'
import AccountAvatar from '@/components/AccountAvatar'
import MemberAccountRoles from '@/components/MemberAccountRoles'
import {
  isForeignServiceAccount,
  parseServiceAccountUsername,
  mapTableHeader
} from '@/utils'

export default {
  name: 'project-service-account-row',
  components: {
    TimeString,
    AccountAvatar,
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
    ...mapState([
      'namespace'
    ]),
    ...mapGetters([
      'canManageServiceAccountMembers',
      'canGetSecrets',
      'canDeleteSecrets'
    ]),
    isServiceAccountFromCurrentNamespace () {
      return !isForeignServiceAccount(this.namespace, this.item.username)
    },
    createdByClasses () {
      return this.item.createdBy ? ['font-weight-bold'] : ['grey--text']
    },
    serviceAccountNamespace () {
      const { namespace } = parseServiceAccountUsername(this.item.username)
      return namespace
    },
    selectedHeaders () {
      return mapTableHeader(this.headers, 'selected')
    }
  },
  methods: {
    onDownload () {
      this.$emit('download', this.item)
    },
    onKubeconfig () {
      this.$emit('kubeconfig', this.item)
    },
    onRotateSecret () {
      this.$emit('rotateSecret', this.item)
    },
    onEdit () {
      this.$emit('edit', this.item)
    },
    onDelete () {
      this.$emit('delete', this.item)
    }
  }
}
</script>

<style lang="scss" scoped>
  .description-column {
    max-width: 20vw;
    max-height: 60px;
    overflow: scroll;
  }
</style>
