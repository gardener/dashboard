<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    :shoot-item="shootItem"
    :loading="isMaintenanceToBeScheduled"
    @dialog-opened="startDialogVisible"
    ref="actionDialog"
    width="900"
    :caption="caption"
    icon="mdi-refresh"
    :button-text="buttonText"
    confirm-button-text="Trigger now">
    <template #actionComponent>
      <div class="text-subtitle-1 pt-4">Do you want to start the maintenance of your cluster outside of the configured maintenance time window?</div>
      <g-maintenance-components
        title="The following updates will be performed"
        :selectable="false"
        ref="maintenanceComponents"
      ></g-maintenance-components>
      <v-alert type="warning" variant="outlined" :value="!isMaintenancePreconditionSatisfied">
        <div class="font-weight-bold">Your hibernation schedule may not have any effect:</div>
        {{maintenancePreconditionSatisfiedMessage}}
      </v-alert>
    </template>
  </g-action-button-dialog>
</template>

<script>
import { defineComponent } from 'vue'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'
import GMaintenanceComponents from '@/components/ShootMaintenance/GMaintenanceComponents'

import { errorDetailsFromError } from '@/utils/error'
import { shootItem } from '@/mixins/shootItem'
import get from 'lodash/get'

export default defineComponent({
  components: {
    GActionButtonDialog,
    GMaintenanceComponents,
  },
  props: {
    text: {
      type: Boolean,
    },
  },
  inject: ['api', 'notify'],
  mixins: [shootItem],
  data () {
    return {
      maintenanceTriggered: false,
    }
  },
  computed: {
    isMaintenanceToBeScheduled () {
      return this.shootGardenOperation === 'maintain'
    },
    caption () {
      if (this.isMaintenanceToBeScheduled) {
        return 'Requesting to schedule cluster maintenance'
      }
      return this.buttonTitle
    },
    updateKubernetesVersion () {
      return get(this.shootItem, 'spec.maintenance.autoUpdate.kubernetesVersion', false)
    },
    updateOSVersion () {
      return get(this.shootItem, 'spec.maintenance.autoUpdate.machineImageVersion', false)
    },
    buttonTitle () {
      return 'Schedule Maintenance'
    },
    buttonText () {
      if (!this.text) {
        return
      }
      return this.buttonTitle
    },
  },
  methods: {
    async startDialogVisible () {
      this.reset()
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.startMaintenance()
      }
    },
    async startMaintenance () {
      this.maintenanceTriggered = true

      const maintain = { 'gardener.cloud/operation': 'maintain' }
      try {
        await this.api.addShootAnnotation({ namespace: this.shootNamespace, name: this.shootName, data: maintain })
      } catch (err) {
        const errorMessage = 'Could not start maintenance'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)

        this.maintenanceTriggered = false
        this.currentGeneration = null
      }
    },
    reset () {
      this.$refs.maintenanceComponents.setComponentUpdates({ k8sUpdates: this.updateKubernetesVersion, osUpdates: this.updateOSVersion })
    },
  },
  watch: {
    isMaintenanceToBeScheduled (maintenanceToBeScheduled) {
      const isMaintenanceScheduled = !maintenanceToBeScheduled && this.maintenanceTriggered
      if (!isMaintenanceScheduled) {
        return
      }
      this.maintenanceTriggered = false

      if (!this.shootName) { // ensure that notification is not triggered by shoot resource being cleared (e.g. during navigation)
        return
      }

      this.notify({
        text: `Maintenance scheduled for ${this.shootName}`,
        type: 'success',
        position: 'bottom right',
        duration: 5000,
      })
    },
  },
})
</script>

<style lang="scss" scoped>
  .progress-icon {
    font-size: 15px;
  }

  .vertical-align-middle {
    vertical-align: middle;
  }
</style>
