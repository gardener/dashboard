<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    :shoot-item="shootItem"
    :valid="!v$.$invalid"
    width="900"
    caption="Configure Maintenance"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #actionComponent>
      <g-maintenance-time
        ref="maintenanceTime"
        :time-window-begin="data.timeWindowBegin"
        :time-window-end="data.timeWindowEnd"
      />
      <g-maintenance-components
        ref="maintenanceComponents"
        :has-shoot-worker-groups="hasShootWorkerGroups"
      />
    </template>
  </g-action-button-dialog>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'
import GMaintenanceComponents from '@/components/ShootMaintenance/GMaintenanceComponents'
import GMaintenanceTime from '@/components/ShootMaintenance/GMaintenanceTime'

import { errorDetailsFromError } from '@/utils/error'
import { shootItem } from '@/mixins/shootItem'

import {
  get,
  assign,
} from '@/lodash'

export default {
  components: {
    GActionButtonDialog,
    GMaintenanceComponents,
    GMaintenanceTime,
  },
  mixins: [shootItem],
  inject: ['api', 'logger'],
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      data: {
        timeWindowBegin: undefined,
        timeWindowEnd: undefined,
        updateKubernetesVersion: false,
        updateOSVersion: false,
      },
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
          updateOSVersion: osUpdates,
        })
        if (this.hasShootWorkerGroups) {
          delete this.data.updateOSVersion
        }
        await this.api.updateShootMaintenance({ namespace: this.shootNamespace, name: this.shootName, data: this.data })
      } catch (err) {
        const errorMessage = 'Could not save maintenance configuration'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    reset () {
      this.data.timeWindowBegin = get(this.shootItem, 'spec.maintenance.timeWindow.begin')
      this.data.timeWindowEnd = get(this.shootItem, 'spec.maintenance.timeWindow.end')
      this.data.updateKubernetesVersion = get(this.shootItem, 'spec.maintenance.autoUpdate.kubernetesVersion', false)
      this.data.updateOSVersion = get(this.shootItem, 'spec.maintenance.autoUpdate.machineImageVersion', false)

      this.$refs.maintenanceTime.reset()

      this.$refs.maintenanceComponents.setComponentUpdates({ k8sUpdates: this.data.updateKubernetesVersion, osUpdates: this.data.updateOSVersion })
    },
  },
}
</script>
