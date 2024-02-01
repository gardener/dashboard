<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    :shoot-item="shootItem"
    width="600"
    :caption="caption"
    :text="buttonText"
    confirm-button-text="Delete"
    confirm-required
    icon="mdi-delete"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <v-card-text>
        <div>
          Created By
          <g-account-avatar
            :account-name=" shootCreatedBy "
            :size="22"
            class="my-2"
          />
        </div>
        <div class="mt-2">
          Type <span class="font-weight-bold">{{ shootName }}</span> below and confirm the deletion of the cluster and all of its content.
        </div>
        <div class="mb-2 font-weight-bold">
          This action cannot be undone.
        </div>
        <v-alert
          v-if="isShootReconciliationDeactivated"
          class="my-2"
          type="warning"
        >
          <span>The cluster will not be deleted as long as reconciliation is deactivated.</span>
        </v-alert>
      </v-card-text>
    </template>
  </g-action-button-dialog>
</template>

<script>
import { mapActions } from 'pinia'

import { useShootStore } from '@/store/shoot'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog.vue'
import GAccountAvatar from '@/components/GAccountAvatar.vue'

import { shootItem } from '@/mixins/shootItem'
import { errorDetailsFromError } from '@/utils/error'

export default {
  components: {
    GActionButtonDialog,
    GAccountAvatar,
  },
  mixins: [shootItem],
  inject: ['logger'],
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    text: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
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
    },
  },
  methods: {
    ...mapActions(useShootStore, [
      'deleteShoot',
    ]),
    async onConfigurationDialogOpened () {
      if (await this.$refs.actionDialog.waitForDialogClosed()) {
        this.deleteCluster()
      }
    },
    async deleteCluster () {
      try {
        await this.deleteShoot({ name: this.shootName, namespace: this.shootNamespace })
      } catch (err) {
        const errorMessage = 'Cluster deletion failed'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
  },
}
</script>
