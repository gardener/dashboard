<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <tr>
    <td>
      <div class="d-flex flex-row my-2 align-center">
        <div class="d-flex flex-row mr-3">
          <v-avatar :size="40"><img :src="item.avatarUrl" ></v-avatar>
        </div>
        <div class="d-flex flex-column">
          <div>
            <span class="subtitle-1">{{item.displayName}}</span>
            <v-tooltip top v-if="!isServiceAccountFromCurrentNamespace">
              <template v-slot:activator="{ on }">
                <v-icon v-on="on" small class="ml-1">mdi-account-arrow-left</v-icon>
              </template>
              <span>Service Account invited from namespace {{serviceAccountNamespace}}</span>
            </v-tooltip>
          </div>

          <span class="body-2">{{item.username}}</span>
        </div>
      </div>
    </td>
    <td>
      <account-avatar :account-name="item.createdBy" :size="16"></account-avatar>
    </td>
    <td>
      <div>
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <span v-on="on">
              <time-string :date-time="item.creationTimestamp" mode="past"></time-string>
            </span>
          </template>
          {{item.created}}
        </v-tooltip>
      </div>
    </td>
    <td style="max-width: 20vw">
      <span v-if="item.description">{{item.description}}</span>
      <span v-else class="font-weight-light text--disabled">Not defined</span>
    </td>
    <td>
      <account-roles :role-display-names="item.roleDisplayNames"></account-roles>
    </td>
    <td>
      <div class="d-flex flex-row">
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
            <span>Change Service Account Roles</span>
          </v-tooltip>
        </div>
        <div v-if="canManageServiceAccountMembers" class="ml-1">
          <v-tooltip top>
            <template v-slot:activator="{ on }">
              <v-btn v-on="on" icon color="red" @click.native.stop="onDelete">
                <v-icon v-if="isServiceAccountFromCurrentNamespace">mdi-delete</v-icon>
                <v-icon v-else>mdi-close</v-icon>
              </v-btn>
            </template>
            <span v-if="isServiceAccountFromCurrentNamespace">Delete Service Account</span>
            <span v-else>Remove Foreign Service Account from Project</span>
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
import AccountRoles from '@/components/AccountRoles'
import {
  isForeignServiceAccount,
  parseServiceAccountUsername
} from '@/utils'

export default {
  name: 'project-service-account-row',
  components: {
    TimeString,
    AccountAvatar,
    AccountRoles
  },
  props: {
    item: {
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
      return !isForeignServiceAccount(this.item.namespace, this.item.username)
    },
    createdByClasses () {
      return this.item.createdBy ? ['font-weight-bold'] : ['grey--text']
    },
    serviceAccountNamespace () {
      const { namespace } = parseServiceAccountUsername(this.item.username)
      return namespace
    }
  },
  methods: {
    onDownload () {
      this.$emit('download', this.item.username)
    },
    onKubeconfig () {
      this.$emit('kubeconfig', this.item.username)
    },
    onRotateSecret () {
      this.$emit('rotateSecret', this.item.username)
    },
    onEdit (username) {
      this.$emit('edit', this.item.username, this.item.roles, this.item.description)
    },
    onDelete (username) {
      this.$emit('delete', this.item.username)
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
