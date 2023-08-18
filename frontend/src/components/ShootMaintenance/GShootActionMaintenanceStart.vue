<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-shoot-action-dialog
    v-if="dialog"
    ref="actionDialog"
    :shoot-item="shootItem"
    :caption="caption"
    confirm-button-text="Trigger now"
    width="900"
  >
    <div class="text-subtitle-1 pt-4">
      Do you want to start the maintenance of your cluster outside of the configured maintenance time window?
    </div>
    <g-maintenance-components
      ref="maintenanceComponents"
      title="The following updates might be performed"
      :selectable="false"
    />
    <v-alert
      type="warning"
      variant="outlined"
      :value="!isMaintenancePreconditionSatisfied"
    >
      <div class="font-weight-bold">
        Your hibernation schedule may not have any effect:
      </div>
      {{ maintenancePreconditionSatisfiedMessage }}
    </v-alert>
  </g-shoot-action-dialog>
  <g-shoot-action-button
    v-if="button"
    ref="actionButton"
    :shoot-item="shootItem"
    :loading="isMaintenanceToBeScheduled"
    icon="mdi-refresh"
    :text="buttonText"
    :caption="caption"
    @click="internalValue = true"
  />
</template>

<script>
import GShootActionButton from '@/components/GShootActionButton.vue'
import GShootActionDialog from '@/components/GShootActionDialog.vue'
import GMaintenanceComponents from '@/components/ShootMaintenance/GMaintenanceComponents'

import { shootItem } from '@/mixins/shootItem'
import { errorDetailsFromError } from '@/utils/error'

import { get } from '@/lodash'

export default {
  components: {
    GShootActionButton,
    GShootActionDialog,
    GMaintenanceComponents,
  },
  mixins: [shootItem],
  inject: ['api', 'notify', 'logger'],
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    text: {
      type: Boolean,
      default: false,
    },
    dialog: {
      type: Boolean,
      default: false,
    },
    button: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    'update:modelValue',
  ],
  data () {
    return {
      maintenanceTriggered: false,
    }
  },
  computed: {
    internalValue: {
      get () {
        return this.modelValue
      },
      set (value) {
        this.$emit('update:modelValue', value)
      },
    },
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
  watch: {
    modelValue (value) {
      if (this.dialog) {
        const actionDialog = this.$refs.actionDialog
        if (value) {
          actionDialog.showDialog()
          this.waitForConfirmation()
        } else {
          actionDialog.hideDialog()
        }
      }
    },
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
  methods: {
    waitForConfirmation () {
      this.$nextTick(async () => {
        const actionDialog = this.$refs.actionDialog
        try {
          if (await actionDialog.waitForDialogClosed()) {
            this.startMaintenance()
          }
        } catch (err) {
          /* ignore error */
        } finally {
          this.internalValue = false
        }
      })
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
        this.logger.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)

        this.maintenanceTriggered = false
        this.currentGeneration = null
      }
    },
    reset () {
      this.$refs.maintenanceComponents.setComponentUpdates({ k8sUpdates: this.updateKubernetesVersion, osUpdates: this.updateOSVersion })
    },
  },
}
</script>
@/lodash
