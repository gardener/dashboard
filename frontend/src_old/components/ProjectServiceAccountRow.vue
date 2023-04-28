<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <tr>
    <td v-if="selectedHeaders.displayName">
      <v-list-item class="pl-0">
        <v-list-item-avatar><img :src="item.avatarUrl" :alt="`avatar of ${item.username}`"/></v-list-item-avatar>
        <v-list-item-content>
          <v-list-item-title class="d-flex">
            <span class="text-subtitle-1">{{item.displayName}}</span>
            <v-tooltip location="top" v-if="foreign">
              <template v-slot:activator="{ on }">
                <v-icon v-on="on" size="small" class="ml-1">mdi-account-arrow-left</v-icon>
              </template>
              <span>Service Account invited from namespace {{serviceAccountNamespace}}</span>
            </v-tooltip>
            <v-tooltip location="top" v-if="orphaned">
              <template v-slot:activator="{ on }">
                <v-icon v-on="on" size="small" class="ml-1" color="warning">mdi-alert-circle-outline</v-icon>
              </template>
              <span>Associated Service Account does not exists</span>
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
        <time-string v-if="item.creationTimestamp" :date-time="item.creationTimestamp" mode="past"></time-string>
        <span v-else class="font-weight-light text--disabled">unknown</span>
      </div>
    </td>
    <td v-if="selectedHeaders.description">
      <div class="description-column">
        <span v-if="item.description">{{item.description}}</span>
        <span v-else class="font-weight-light text--disabled">not defined</span>
      </div>
    </td>
    <td v-if="selectedHeaders.roles">
      <div class="d-flex justify-end">
        <member-account-roles :role-display-names="item.roleDisplayNames"></member-account-roles>
      </div>
    </td>
    <td v-if="selectedHeaders.actions">
      <div class="d-flex flex-row justify-end mr-n2">
        <div v-if="!foreign && canCreateTokenRequest" class="ml-1">
          <v-tooltip location="top">
            <template v-slot:activator="{ on }">
              <v-btn v-on="on" color="action-button" icon @click.stop="onDownload" :disabled="orphaned">
                <v-icon>mdi-download</v-icon>
              </v-btn>
            </template>
            <span>Download Kubeconfig</span>
          </v-tooltip>
        </div>
        <div v-if="!foreign && canCreateTokenRequest" class="ml-1">
          <v-tooltip location="top">
            <template v-slot:activator="{ on }">
              <v-btn v-on="on" color="action-button" icon @click="onKubeconfig" :disabled="orphaned">
                <v-icon>mdi-eye</v-icon>
              </v-btn>
            </template>
            <span>Show Kubeconfig</span>
          </v-tooltip>
        </div>
        <div v-if="!foreign && canDeleteServiceAccounts && canCreateServiceAccounts" class="ml-1">
          <v-tooltip location="top">
            <template v-slot:activator="{ on }">
              <v-btn v-on="on" color="action-button"  icon @click="onResetServiceAccount">
                <v-icon>mdi-refresh</v-icon>
              </v-btn>
            </template>
            <span>Reset Service Account</span>
          </v-tooltip>
        </div>
        <div v-if="canManageServiceAccountMembers" class="ml-1">
          <v-tooltip location="top">
            <template v-slot:activator="{ on }">
              <v-btn v-on="on" color="action-button" icon @click.stop="onEdit">
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
            </template>
            <span>Edit Service Account</span>
          </v-tooltip>
        </div>
        <div v-if="canManageServiceAccountMembers && canDeleteServiceAccounts" class="ml-1">
          <v-tooltip location="top">
            <template v-slot:activator="{ on }">
               <div v-on="on">
                <v-btn icon color="action-button" @click.stop="onDelete" :disabled="!canDelete">
                  <v-icon>{{ foreign || orphaned ? 'mdi-close' : 'mdi-delete' }}</v-icon>
                </v-btn>
               </div>
            </template>
            <span>{{deleteTooltip}}</span>
          </v-tooltip>
        </div>
      </div>
    </td>
  </tr>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import TimeString from '@/components/TimeString.vue'
import AccountAvatar from '@/components/AccountAvatar.vue'
import MemberAccountRoles from '@/components/MemberAccountRoles.vue'
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
      'canCreateServiceAccounts',
      'canDeleteServiceAccounts',
      'canCreateTokenRequest'
    ]),
    orphaned () {
      return this.item.orphaned
    },
    foreign () {
      return isForeignServiceAccount(this.namespace, this.item.username)
    },
    canDelete () {
      return this.foreign || this.orphaned || !this.item.deletionTimestamp
    },
    deleteTooltip () {
      if (!this.canDelete) {
        return 'Service Account is already marked for deletion'
      }
      if (this.orphaned) {
        return 'Remove Service Account from Project'
      }
      if (this.foreign) {
        return 'Remove foreign Service Account from Project'
      }
      return 'Delete Service Account'
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
    onResetServiceAccount () {
      this.$emit('reset-serviceaccount', this.item)
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
    overflow: auto;
  }
</style>
