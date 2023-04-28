<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <action-button-dialog
    :shoot-item="shootItem"
    @dialog-opened="onDeleteDialogOpened"
    ref="actionDialog"
    :caption="caption"
    icon="mdi-delete"
    confirm-button-text="Delete"
    confirm-required
    :button-text="buttonText"
    :small-icon="small"
    width="600"
  >
    <template v-slot:actionComponent>
      <v-list>
        <v-list-item-content>
          <v-list-item-subtitle>
            Created By
          </v-list-item-subtitle>
          <v-list-item-title>
            <account-avatar :account-name="shootCreatedBy" :size="22"></account-avatar>
          </v-list-item-title>
        </v-list-item-content>
      </v-list>
      <p>
        Type <span class="font-weight-bold">{{shootName}}</span> below and confirm the deletion of the cluster and all of its content.
      </p>
      <p class="mt-2 text-error font-weight-bold">
        This action cannot be undone.
      </p>
      <p v-if="isShootReconciliationDeactivated">
        <v-row class="fill-height" >
          <v-icon color="warning" class="mr-1">mdi-alert-box</v-icon>
          <span>The cluster will not be deleted as long as reconciliation is deactivated.</span>
        </v-row>
      </p>
    </template>
  </action-button-dialog>
</template>

<script>
import AccountAvatar from '@/components/AccountAvatar.vue'
import ActionButtonDialog from '@/components/dialogs/ActionButtonDialog.vue'
import { mapActions } from 'vuex'
import { errorDetailsFromError } from '@/utils/error'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    ActionButtonDialog,
    AccountAvatar
  },
  props: {
    small: {
      type: Boolean,
      default: false
    },
    text: {
      type: Boolean
    }
  },
  mixins: [shootItem],
  data () {
    return {
      renderDialog: false,
      errorMessage: null,
      detailedErrorMessage: null
    }
  },
  computed: {
    icon () {
      return 'mdi-delete'
    },
    caption () {
      return this.isShootMarkedForDeletion
        ? 'Cluster already marked for deletion'
        : this.buttonTitle
    },
    buttonTitle () {
      return 'Delete Cluster'
    },
    buttonText () {
      if (!this.text) {
        return
      }
      return this.buttonTitle
    }
  },
  methods: {
    async onDeleteDialogOpened () {
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.doDeleteCluster()
      }
    },
    async doDeleteCluster () {
      try {
        await this.deleteShoot({ name: this.shootName, namespace: this.shootNamespace })
      } catch (err) {
        const errorMessage = 'Cluster deletion failed'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    ...mapActions([
      'deleteShoot'
    ])
  }
}
</script>

<style lang="scss" scoped>
  p {
    margin-bottom: 0
  }
</style>
