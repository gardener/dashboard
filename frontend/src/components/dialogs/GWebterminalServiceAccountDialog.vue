<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-dialog
    ref="gDialog"
    v-model:error-message="errorMessage"
    v-model:detailed-error-message="detailedErrorMessage"
    :confirm-button-text="confirmButtonText"
    width="800"
    max-height="100vh"
  >
    <template #caption>
      <template v-if="needsUpdate">
        Update Service Account
      </template>
      <template v-else>
        Add Service Account
      </template>
    </template>
    <template #content>
      <v-card-text>
        <div
          key="confirm-message"
          style="min-height:100px"
        >
          <div>
            <span v-if="needsUpdate">To access the garden cluster the <span class="font-family-monospace">{{ serviceAccountName }}</span> service account requires the <span class="font-family-monospace">admin</span> and <span class="font-family-monospace">serviceaccountmanager</span> role.</span>
            <span v-else>To access the garden cluster a dedicated service account is required.</span>
          </div>
          <div>
            <span v-if="needsUpdate">Do you want grant the <span class="font-family-monospace">admin</span> and <span class="font-family-monospace">serviceaccountmanager</span> role to the service account?</span>
            <span v-else>Do you want to create the <span class="font-family-monospace">{{ serviceAccountName }}</span> service account and add it as member with <span class="font-family-monospace">admin</span> and <span class="font-family-monospace">serviceaccountmanager</span> role to this project?</span>
            <v-list>
              <v-list-item>
                <v-list-item-title class="wrap-text">
                  <g-account-avatar :account-name="serviceAccountUsername" />
                </v-list-item-title>
                <template #append>
                  <v-list-item-action>
                    <g-account-roles :role-descriptors="desiredRoleDescriptors" />
                  </v-list-item-action>
                </template>
              </v-list-item>
            </v-list>
          </div>
        </div>
      </v-card-text>
    </template>
  </g-dialog>
</template>

<script>
import { mapActions } from 'pinia'

import { useMemberStore } from '@/store/member'

import GDialog from '@/components/dialogs/GDialog.vue'
import GAccountAvatar from '@/components/GAccountAvatar.vue'
import GAccountRoles from '@/components/Members/GAccountRoles.vue'

import {
  errorDetailsFromError,
  isConflict,
} from '@/utils/error'
import { sortedRoleDescriptors } from '@/utils'

import get from 'lodash/get'

export default {
  components: {
    GDialog,
    GAccountAvatar,
    GAccountRoles,
  },
  inject: ['logger'],
  props: {
    namespace: {
      type: String,
    },
  },
  data () {
    return {
      errorMessage: undefined,
      detailedErrorMessage: undefined,
      member: undefined,
    }
  },
  computed: {
    needsUpdate () {
      return !!this.member
    },
    confirmButtonText () {
      if (this.needsUpdate) {
        return 'Update'
      }
      return 'Add'
    },
    serviceAccountName () {
      return 'dashboard-webterminal'
    },
    serviceAccountUsername () {
      return `system:serviceaccount:${this.namespace}:${this.serviceAccountName}`
    },
    desiredRoleDescriptors () {
      return sortedRoleDescriptors(this.desiredRoles)
    },
    desiredRoles () {
      const roles = [...get(this.member, ['roles'], [])]
      roles.push('admin')
      roles.push('serviceaccountmanager')
      return roles
    },
  },
  methods: {
    ...mapActions(useMemberStore, [
      'addMember',
      'updateMember',
    ]),
    async promptForConfirmation (member) {
      this.member = member

      return await this.$refs.gDialog.confirmWithDialog(async () => {
        return this.addServiceAccount()
      })
    },
    async addServiceAccount () {
      if (!this.namespace) {
        this.logger.error('no namespace set')
        return false
      }

      const description = 'Service account required to manage temporary service accounts for the webterminal feature of the gardener dashboard. Will be cleaned up automatically if not referenced anymore by a webterminal'
      try {
        if (this.needsUpdate) {
          await this.updateMember({
            name: this.serviceAccountUsername,
            roles: this.desiredRoles,
            description,
          })
        } else {
          await this.addMember({
            name: this.serviceAccountUsername,
            roles: this.desiredRoles,
            description,
          })
        }
        return true
      } catch (err) {
        const errorDetails = errorDetailsFromError(err)
        if (isConflict(err)) {
          return true // service account already exists
        } else {
          this.errorMessage = 'Failed to add service account'
        }
        this.detailedErrorMessage = errorDetails.detailedMessage
        this.logger.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
        return false
      }
    },
  },
}
</script>
