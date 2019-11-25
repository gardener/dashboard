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
    :valid="maintenanceTimeValid"
    @dialogOpened="onConfigurationDialogOpened"
    ref="actionDialog"
    caption="Configure Maintenance">
    <template slot="actionComponent">
      <maintenance-time
        ref="maintenanceTime"
        :time-window-begin="data.timeWindowBegin"
        @valid="onMaintenanceTimeValid"
      ></maintenance-time>
      <maintenance-components
        ref="maintenanceComponents"
      ></maintenance-components>
    </template>
  </action-icon-dialog>
</template>

<script>
import ActionIconDialog from '@/dialogs/ActionIconDialog'
import MaintenanceComponents from '@/components/ShootMaintenance/MaintenanceComponents'
import MaintenanceTime from '@/components/ShootMaintenance/MaintenanceTime'
import { updateShootMaintenance } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import get from 'lodash/get'
import assign from 'lodash/assign'
import { shootItem } from '@/mixins/shootItem'

export default {
  name: 'maintenance-configuration',
  components: {
    ActionIconDialog,
    MaintenanceComponents,
    MaintenanceTime
  },
  props: {
    shootItem: {
      type: Object
    }
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
        const { utcBegin, utcEnd } = this.$refs.maintenanceTime.getUTCMaintenanceWindow()
        const { k8sUpdates, osUpdates } = this.$refs.maintenanceComponents.getComponentUpdates()
        assign(this.data, {
          timeWindowBegin: utcBegin,
          timeWindowEnd: utcEnd,
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

      this.$refs.maintenanceComponents.setComponentUpdates({ k8sUpdates: this.data.updateOSVersion, osUpdates: this.data.updateKubernetesVersion })
    },
    onMaintenanceTimeValid (value) {
      this.maintenanceTimeValid = value
    }
  }
}
</script>
