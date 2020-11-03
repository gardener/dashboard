<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <action-button-dialog
    :shootItem="shootItem"
    :loading="isMaintenanceToBeScheduled"
    @dialogOpened="startDialogVisible"
    ref="actionDialog"
    :caption="caption"
    icon="mdi-refresh"
    :buttonText="buttonText"
    maxWidth="850"
    confirmButtonText="Trigger now">
    <template v-slot:actionComponent>
      <v-row >
        <v-col>
          <div class="subtitle-1 pt-4">Do you want to start the maintenance of your cluster outside of the configured maintenance time window?</div>
        </v-col>
        <maintenance-components
          title="The following updates will be performed"
          :selectable="false"
          ref="maintenanceComponents"
        ></maintenance-components>
      </v-row>
    </template>
  </action-button-dialog>
</template>

<script>
import ActionButtonDialog from '@/components/dialogs/ActionButtonDialog'
import MaintenanceComponents from '@/components/ShootMaintenance/MaintenanceComponents'
import { addShootAnnotation } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import { SnotifyPosition } from 'vue-snotify'
import get from 'lodash/get'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    ActionButtonDialog,
    MaintenanceComponents
  },
  props: {
    shootItem: {
      type: Object
    },
    text: {
      type: Boolean
    }
  },
  mixins: [shootItem],
  data () {
    return {
      maintenanceTriggered: false
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
    }
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
        await addShootAnnotation({ namespace: this.shootNamespace, name: this.shootName, data: maintain })
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
    }
  },
  watch: {
    isMaintenanceToBeScheduled (maintenanceToBeScheduled) {
      const isMaintenanceScheduled = !maintenanceToBeScheduled && this.maintenanceTriggered
      if (!isMaintenanceScheduled) {
        return
      }
      this.maintenanceTriggered = false

      if (!this.shootName) { // ensure that notification is not triggered by shoot resource beeing cleared (e.g. during navigation)
        return
      }
      const config = {
        position: SnotifyPosition.rightBottom,
        timeout: 5000,
        showProgressBar: false
      }
      this.$snotify.success(`Maintenance scheduled for ${this.shootName}`, config)
    }
  }
}
</script>

<style lang="scss" scoped>
  .progress-icon {
    font-size: 15px;
  }

  .vertical-align-middle {
    vertical-align: middle;
  }
</style>
