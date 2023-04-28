<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-dialog
    :confirm-button-text="confirmButtonText"
    width="750"
    max-height="100vh"
    ref="gDialog"
    >
    <template v-slot:caption>
      <template v-if="needsUpdate">
        Update Service Account
      </template>
      <template v-else>
        Add Service Account
      </template>
    </template>
    <template v-slot:message>
      <div key="confirm-message" style="min-height:100px">
        <div>
          <span v-if="needsUpdate">To access the garden cluster the <span class="font-family-monospace">{{serviceAccountName}}</span> service account requires the <span class="font-family-monospace">admin</span> and <span class="font-family-monospace">serviceaccountmanager</span> role.</span>
          <span v-else>To access the garden cluster a dedicated service account is required.</span>
        </div>
        <div>
           <span v-if="needsUpdate">Do you want grant the <span class="font-family-monospace">admin</span> and <span class="font-family-monospace">serviceaccountmanager</span> role to the service account?</span>
           <span v-else>Do you want to create the <span class="font-family-monospace">{{serviceAccountName}}</span> service account and add it as member with <span class="font-family-monospace">admin</span> and <span class="font-family-monospace">serviceaccountmanager</span> role to this project?</span>
          <v-list>
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title class="wrap-text">
                  <account-avatar :account-name="serviceAccountUsername"></account-avatar>
                </v-list-item-title>
              </v-list-item-content>
              <v-list-item-action>
                <member-account-roles :role-display-names="desiredRoleDisplayNames"></member-account-roles>
              </v-list-item-action>
            </v-list-item>
          </v-list>
        </div>
      </div>
      <g-message
        color="error"
        class="ma-0"
        v-model:message="errorMessage"
        v-model:detailed-message="detailedErrorMessage"
      ></g-message>
    </template>
  </g-dialog>
</template>

<script>
import GDialog from '@/components/dialogs/GDialog.vue'
import AccountAvatar from '@/components/AccountAvatar.vue'
import GMessage from '@/components/GMessage.vue'
import MemberAccountRoles from '@/components/MemberAccountRoles.vue'
import { errorDetailsFromError, isConflict } from '@/utils/error'
import { mapActions } from 'vuex'
import get from 'lodash/get'
import { sortedRoleDisplayNames } from '@/utils'

export default {
  name: 'WebterminalServiceAccountDialog',
  components: {
    GDialog,
    GMessage,
    AccountAvatar,
    MemberAccountRoles
  },
  props: {
    namespace: {
      type: String
    }
  },
  data () {
    return {
      errorMessage: undefined,
      detailedErrorMessage: undefined,
      member: undefined
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
    desiredRoleDisplayNames () {
      return sortedRoleDisplayNames(this.desiredRoles)
    },
    desiredRoles () {
      const roles = [...get(this.member, 'roles', [])]
      roles.push('admin')
      roles.push('serviceaccountmanager')
      return roles
    }
  },
  methods: {
    ...mapActions([
      'addMember',
      'updateMember'
    ]),
    async promptForConfirmation (member) {
      this.member = member

      return await this.$refs.gDialog.confirmWithDialog(async () => {
        return this.addServiceAccount()
      })
    },
    async addServiceAccount () {
      if (!this.namespace) {
        // eslint-disable-next-line no-console
        console.error('no namespace set')
        return false
      }

      const description = 'Service account required to manage temporary service accounts for the webterminal feature of the gardener dashboard. Will be cleaned up automatically if not referenced anymore by a webterminal'
      try {
        if (this.needsUpdate) {
          await this.updateMember({
            name: this.serviceAccountUsername,
            roles: this.desiredRoles,
            description
          })
        } else {
          await this.addMember({
            name: this.serviceAccountUsername,
            roles: this.desiredRoles,
            description
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
        // eslint-disable-next-line no-console
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
        return false
      }
    }
  }
}
</script>
