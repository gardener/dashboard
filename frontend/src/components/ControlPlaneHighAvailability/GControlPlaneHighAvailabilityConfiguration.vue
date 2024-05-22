<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    caption="Configure Control Plane High Availability"
    width="600"
    max-height="60vh"
    confirm-required
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <v-card-text>
        <g-manage-control-plane-high-availability
          :key="componentKey"
        />
      </v-card-text>
    </template>
  </g-action-button-dialog>
</template>

<script>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'

import { useShootContextStore } from '@/store/shootContext'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'
import GManageControlPlaneHighAvailability from '@/components/ControlPlaneHighAvailability/GManageControlPlaneHighAvailability'

import { useShootItem } from '@/composables/useShootItem'

import { errorDetailsFromError } from '@/utils/error'
import { v4 as uuidv4 } from '@/utils/uuid'

export default {
  components: {
    GActionButtonDialog,
    GManageControlPlaneHighAvailability,
  },
  inject: ['api', 'logger'],
  setup () {
    const {
      shootItem,
      shootNamespace,
      shootName,
    } = useShootItem()

    const shootContextStore = useShootContextStore()
    const {
      controlPlaneFailureToleranceType,
    } = storeToRefs(shootContextStore)

    const componentKey = ref(uuidv4())

    return {
      shootItem,
      shootNamespace,
      shootName,
      controlPlaneFailureToleranceType,
      componentKey,
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
      this.componentKey = uuidv4() // force re-render
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.updateConfiguration()
      }
    },
    async updateConfiguration () {
      try {
        await this.api.updateShootControlPlaneHighAvailability({
          namespace: this.shootNamespace,
          name: this.shootName,
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
  },
}
</script>
