<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <action-icon-dialog
    :shootItem="shootItem"
    :loading="isMaintenanceToBeScheduled"
    @onDialogVisible="startDialogVisible"
    ref="actionDialog"
    :caption="caption"
    icon="mdi-refresh"
    maxWidth="850"
    confirmButtonText="Trigger now">
    <template slot="actionComponent">
      <v-layout row wrap>
        <v-flex>
          <div class="subheading pt-3">Do you want to start the maintenance of your cluster outside of the configured maintenance time window?</div>
        </v-flex>
        <maintenance-components
          title="The following updates will be performed"
          :updateKubernetesVersion="updateKubernetesVersion"
          :updateOSVersion="updateOSVersion"
          :selectable="false"
          ref="maintenanceComponents"
        ></maintenance-components>
      </v-layout>
    </template>
  </action-icon-dialog>
</template>

<script>
import ActionIconDialog from '@/dialogs/ActionIconDialog'
import MaintenanceComponents from '@/components/ShootMaintenance/MaintenanceComponents'
import { addShootAnnotation } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import { SnotifyPosition } from 'vue-snotify'
import get from 'lodash/get'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    ActionIconDialog,
    MaintenanceComponents
  },
  props: {
    shootItem: {
      type: Object
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
        return 'Requesting to schedule cluster reconcile'
      }
      return 'Schedule Maintenance'
    },
    updateKubernetesVersion () {
      return get(this.shootItem, 'spec.maintenance.autoUpdate.kubernetesVersion', false)
    },
    updateOSVersion () {
      return get(this.shootItem, 'spec.maintenance.autoUpdate.machineImageVersion', false)
    }
  },
  methods: {
    async startDialogVisible () {
      this.reset()
      const confirmed = await this.$refs.actionDialog.waitForActionConfirmed()
      if (confirmed) {
        this.startReconcile()
      }
    },
    async startReconcile () {
      this.maintenanceTriggered = true

      const maintain = { 'shoot.garden.sapcloud.io/operation': 'maintain' }
      try {
        await addShootAnnotation({ namespace: this.shootNamespace, name: this.shootName, data: maintain })
      } catch (err) {
        const errorMessage = 'Could not start maintenance'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)

        this.reconcileTriggered = false
        this.currentGeneration = null
      }
    },
    reset () {
      this.$nextTick(() => {
        this.$refs.maintenanceComponents.reset()
      })
    }
  },
  watch: {
    isMaintenanceToBeScheduled (maintenanceToBeScheduled) {
      const isMaintenanceScheduled = !maintenanceToBeScheduled && this.maintenanceTriggered
      if (isMaintenanceScheduled) {
        this.maintenanceTriggered = false

        if (this.shootName) { // ensure that notification is not triggered by shoot resource beeing cleared (e.g. during navigation)
          const config = {
            position: SnotifyPosition.rightBottom,
            timeout: 5000,
            showProgressBar: false
          }
          this.$snotify.success(`Maintenance scheduled for ${this.shootName}`, config)
        }
      }
    }
  }
}
</script>

<style lang="styl" scoped>
  .progress-icon {
    font-size: 15px;
  }

  .vertical-align-middle {
    vertical-align: middle;
  }
</style>
