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
    <template #scrollable-content>
      <v-card-text>
        <v-list>
          <v-list-item-subtitle>
            Created By
          </v-list-item-subtitle>
          <v-list-item-title>
            <g-account-avatar
              :account-name=" shootCreatedBy "
              :size=" 22 "
            />
          </v-list-item-title>
        </v-list>
        <p>
          Type <span class="font-weight-bold">{{ shootName }}</span> below and confirm the deletion of the cluster and all of its content.
        </p>
        <p class="mt-2 text-error font-weight-bold">
          This action cannot be undone.
        </p>
        <p v-if=" isShootReconciliationDeactivated ">
          <v-row class="fill-height">
            <v-icon
              color="warning"
              class="mr-1"
            >
              mdi-alert-box
            </v-icon>
            <span>The cluster will not be deleted as long as reconciliation is deactivated.</span>
          </v-row>
        </p>
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
    small: {
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

<style lang="scss" scoped>
  p {
    margin-bottom: 0
  }
</style>
