<!--
SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <action-button-dialog
    :shoot-item="shootItem"
    @dialog-opened="onConfigurationDialogOpened"
    ref="actionDialog"
    caption="Configure Control Plane High Availability"
    width="900"
    max-height="60vh"
    >
    <template v-slot:actionComponent>
      <manage-control-plane-ha
        :configured-seed="shootSeedName"
        :configured-cp-failure-tolerance-type="shootControlPlaneHaFailureTolerance"
      ></manage-control-plane-ha>
    </template>
  </action-button-dialog>
</template>

<script>
import { mapActions, mapState } from 'vuex'
import ActionButtonDialog from '@/components/dialogs/ActionButtonDialog'
import ManageControlPlaneHa from '@/components/ControlPlaneHighAvailability/ManageControlPlaneHa'
import { updateShootControlPlaneHa } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    ActionButtonDialog,
    ManageControlPlaneHa
  },
  mixins: [shootItem],
  computed: {
    ...mapState('shootStaging', [
      'cpFailureToleranceType'
    ])
  },
  methods: {
    ...mapActions('shootStaging', [
      'setClusterConfiguration'
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
            type: this.cpFailureToleranceType
          }
        }
        await updateShootControlPlaneHa({ namespace: this.shootNamespace, name: this.shootName, data: highAvailability })
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
    }
  }
}
</script>
