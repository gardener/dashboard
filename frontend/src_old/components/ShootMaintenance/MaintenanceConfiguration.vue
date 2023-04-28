<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <action-button-dialog
    :shoot-item="shootItem"
    :valid="maintenanceTimeValid"
    @dialog-opened="onConfigurationDialogOpened"
    ref="actionDialog"
    width="900"
    caption="Configure Maintenance">
    <template v-slot:actionComponent>
      <maintenance-time
        ref="maintenanceTime"
        :time-window-begin="data.timeWindowBegin"
        :time-window-end="data.timeWindowEnd"
        @valid="onMaintenanceTimeValid"
      ></maintenance-time>
      <maintenance-components
        ref="maintenanceComponents"
      ></maintenance-components>
    </template>
  </action-button-dialog>
</template>

<script>
import get from 'lodash/get'
import assign from 'lodash/assign'

import ActionButtonDialog from '@/components/dialogs/ActionButtonDialog.vue'
import MaintenanceComponents from '@/components/ShootMaintenance/MaintenanceComponents.vue'
import MaintenanceTime from '@/components/ShootMaintenance/MaintenanceTime.vue'

import { updateShootMaintenance } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'

import { shootItem } from '@/mixins/shootItem'

export default {
  name: 'maintenance-configuration',
  components: {
    ActionButtonDialog,
    MaintenanceComponents,
    MaintenanceTime
  },
  mixins: [shootItem],
  data () {
    return {
      maintenanceTimeValid: true,
      data: {
        timeWindowBegin: undefined,
        timeWindowEnd: undefined,
        updateKubernetesVersion: false,
        updateOSVersion: false
      }
    }
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
        const { begin, end } = this.$refs.maintenanceTime.getMaintenanceWindow()
        const { k8sUpdates, osUpdates } = this.$refs.maintenanceComponents.getComponentUpdates()
        assign(this.data, {
          timeWindowBegin: begin,
          timeWindowEnd: end,
          updateKubernetesVersion: k8sUpdates,
          updateOSVersion: osUpdates
        })
        await updateShootMaintenance({ namespace: this.shootNamespace, name: this.shootName, data: this.data })
      } catch (err) {
        const errorMessage = 'Could not save maintenance configuration'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    reset () {
      this.maintenanceTimeValid = true

      this.data.timeWindowBegin = get(this.shootItem, 'spec.maintenance.timeWindow.begin')
      this.data.timeWindowEnd = get(this.shootItem, 'spec.maintenance.timeWindow.end')
      this.data.updateKubernetesVersion = get(this.shootItem, 'spec.maintenance.autoUpdate.kubernetesVersion', false)
      this.data.updateOSVersion = get(this.shootItem, 'spec.maintenance.autoUpdate.machineImageVersion', false)

      this.$refs.maintenanceTime.reset()

      this.$refs.maintenanceComponents.setComponentUpdates({ k8sUpdates: this.data.updateKubernetesVersion, osUpdates: this.data.updateOSVersion })
    },
    onMaintenanceTimeValid (value) {
      this.maintenanceTimeValid = value
    }
  }
}
</script>
