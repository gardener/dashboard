<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    :shoot-item="shootItem"
    caption="Configure Control Plane High Availability"
    width="600"
    max-height="60vh"
    confirm-required
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <v-card-text>
        <g-manage-control-plane-high-availability :key="componentKey" />
      </v-card-text>
    </template>
  </g-action-button-dialog>
</template>

<script>
import { mapState } from 'pinia'

import { useShootContextStore } from '@/store/shootContext'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'
import GManageControlPlaneHighAvailability from '@/components/ControlPlaneHighAvailability/GManageControlPlaneHighAvailability'

import { errorDetailsFromError } from '@/utils/error'
import { v4 as uuidv4 } from '@/utils/uuid'

export default {
  components: {
    GActionButtonDialog,
    GManageControlPlaneHighAvailability,
  },
  inject: ['api', 'logger'],
  data () {
    return {
      componentKey: uuidv4(),
    }
  },
  computed: {
    ...mapState(useShootContextStore, [
      'namespace',
      'name',
      'controlPlaneFailureToleranceType',
    ]),
  },
  methods: {
    async onConfigurationDialogOpened () {
      this.reset()
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.updateConfiguration()
      }
    },
    async updateConfiguration () {
      try {
        await this.api.updateShootControlPlaneHighAvailability({
          namespace: this.namespace,
          name: this.name,
          data: {
            failureTolerance: {
              type: this.controlPlaneFailureToleranceType,
            },
          },
        })
      } catch (err) {
        const errorMessage = 'Could not update control plane high availability'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    reset () {
      this.componentKey = uuidv4() // force re-render
    },
  },
}
</script>
