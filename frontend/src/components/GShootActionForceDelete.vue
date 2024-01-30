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
    confirm-button-text="Force Delete"
    confirm-required
    icon="mdi-delete-forever"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <v-card-text>
        <g-force-delete-cluster :shoot-item="shootItem" />
      </v-card-text>
    </template>
  </g-action-button-dialog>
</template>

<script>
import { mapActions } from 'pinia'

import { useShootStore } from '@/store/shoot'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog.vue'
import GForceDeleteCluster from '@/components/GForceDeleteCluster.vue'

import { shootItem } from '@/mixins/shootItem'
import { errorDetailsFromError } from '@/utils/error'

export default {
  components: {
    GActionButtonDialog,
    GForceDeleteCluster,
  },
  mixins: [shootItem],
  inject: ['logger', 'api'],
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
      if (this.isShootMarkedForForceDeletion) {
        return 'Cluster already marked for force deletion'
      }
      return this.isShootMarkedForDeletion
        ? 'Cluster already marked for deletion'
        : this.buttonTitle
    },
    buttonTitle () {
      return 'Force Delete Cluster'
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
        this.forceDeleteCluster()
      }
    },
    async forceDeleteCluster () {
      const annotation = { 'confirmation.gardener.cloud/force-deletion': 'true' }
      try {
        await this.api.addShootAnnotation({ namespace: this.shootNamespace, name: this.shootName, data: annotation })
      } catch (err) {
        const errorMessage = 'Cluster force deletion failed'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
  },
}
</script>
