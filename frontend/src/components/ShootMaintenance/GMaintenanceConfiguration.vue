<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    width="900"
    caption="Configure Maintenance"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <v-card-text>
        <g-maintenance-time />
        <g-maintenance-components />
        <v-alert
          type="warning"
          variant="tonal"
          :model-value="!isMaintenancePreconditionSatisfied"
          class="mt-2"
        >
          <div class="font-weight-bold">
            Gardener may be unable to perform required actions during maintenance
          </div>
          {{ maintenancePreconditionSatisfiedMessage }}
        </v-alert>
      </v-card-text>
    </template>
  </g-action-button-dialog>
</template>

<script>
import { storeToRefs } from 'pinia'
import { useVuelidate } from '@vuelidate/core'

import { useShootContextStore } from '@/store/shootContext'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'
import GMaintenanceComponents from '@/components/ShootMaintenance/GMaintenanceComponents'
import GMaintenanceTime from '@/components/ShootMaintenance/GMaintenanceTime'

import { useShootItem } from '@/composables/useShootItem'

import { errorDetailsFromError } from '@/utils/error'

export default {
  components: {
    GActionButtonDialog,
    GMaintenanceComponents,
    GMaintenanceTime,
  },
  inject: ['api', 'logger'],
  setup () {
    const {
      shootItem,
      shootNamespace,
      shootName,
      hasShootWorkerGroups,
      maintenancePreconditionSatisfiedMessage,
      isMaintenancePreconditionSatisfied,
    } = useShootItem()

    const shootContextStore = useShootContextStore()
    const {
      maintenanceTimeWindowBegin,
      maintenanceTimeWindowEnd,
      maintenanceAutoUpdateKubernetesVersion,
      maintenanceAutoUpdateMachineImageVersion,
    } = storeToRefs(shootContextStore)

    return {
      v$: useVuelidate(),
      shootItem,
      shootNamespace,
      shootName,
      hasShootWorkerGroups,
      maintenancePreconditionSatisfiedMessage,
      isMaintenancePreconditionSatisfied,
      maintenanceTimeWindowBegin,
      maintenanceTimeWindowEnd,
      maintenanceAutoUpdateKubernetesVersion,
      maintenanceAutoUpdateMachineImageVersion,
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.updateConfiguration()
      }
    },
    async updateConfiguration () {
      try {
        const data = {
          timeWindowBegin: this.maintenanceTimeWindowBegin,
          timeWindowEnd: this.maintenanceTimeWindowEnd,
          updateKubernetesVersion: this.maintenanceAutoUpdateKubernetesVersion,
        }
        if (this.hasShootWorkerGroups) {
          data.updateOSVersion = this.maintenanceAutoUpdateMachineImageVersion
        }
        await this.api.updateShootMaintenance({
          namespace: this.shootNamespace,
          name: this.shootName,
          data,
        })
      } catch (err) {
        const errorMessage = 'Could not save maintenance configuration'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
  },
}
</script>
