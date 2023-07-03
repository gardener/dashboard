<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    :shoot-item="shootItem"
    @dialog-opened="onConfigurationDialogOpened"
    ref="actionDialog"
    caption="Configure Control Plane High Availability"
    width="600"
    max-height="60vh"
    confirm-required
    >
    <template #actionComponent>
      <g-manage-control-plane-high-availability :key="componentKey" />
    </template>
  </g-action-button-dialog>
</template>

<script>
import { defineComponent } from 'vue'

import { mapActions, mapState } from 'pinia'
import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'
import GManageControlPlaneHighAvailability from '@/components/ControlPlaneHighAvailability/GManageControlPlaneHighAvailability'
import { errorDetailsFromError } from '@/utils/error'
import { shootItem } from '@/mixins/shootItem'
import { v4 as uuidv4 } from '@/utils/uuid'
import {
  useShootStagingStore,
} from '@/store'

export default defineComponent({
  components: {
    GActionButtonDialog,
    GManageControlPlaneHighAvailability,
  },
  mixins: [shootItem],
  inject: ['api'],
  data () {
    return {
      componentKey: uuidv4(),
    }
  },
  computed: {
    ...mapState(useShootStagingStore, [
      'controlPlaneFailureToleranceType',
    ]),
  },
  methods: {
    ...mapActions(useShootStagingStore, [
      'setClusterConfiguration',
    ]),
    async onConfigurationDialogOpened () {
      this.reset()
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.updateConfiguration()
      }
    },
    async updateConfiguration () {
      try {
        const highAvailability = {
          failureTolerance: {
            type: this.controlPlaneFailureToleranceType,
          },
        }
        await this.api.updateShootControlPlaneHighAvailability({ namespace: this.shootNamespace, name: this.shootName, data: highAvailability })
      } catch (err) {
        const errorMessage = 'Could not update control plane high availability'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    reset () {
      this.setClusterConfiguration(this.shootItem)
      this.componentKey = uuidv4() // force re-render
    },
  },
})
</script>
