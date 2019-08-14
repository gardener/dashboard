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
  <div>
    <v-tooltip top>
      <v-btn slot="activator" icon @click="showDialog" :disabled="isShootMarkedForDeletion || isShootActionsDisabledForPurpose">
        <v-icon medium>{{icon}}</v-icon>
      </v-btn>
      {{shootActionToolTip(caption)}}
    </v-tooltip>
    <confirm-dialog
      confirmButtonText="Save"
      :confirm-disabled="!valid"
      :errorMessage.sync="errorMessage"
      :detailedErrorMessage.sync="detailedErrorMessage"
      ref="confirmDialog"
      confirmColor="orange"
      defaultColor="orange"
      max-width=850
      >
      <template slot="caption">{{caption}}</template>
      <template slot="affectedObjectName">{{shootName}}</template>
      <template slot="message">
        <maintenance-time
          ref="maintenanceTime"
          :time-window-begin="data.timeWindowBegin"
          @valid="onMaintenanceTimeValid"
        ></maintenance-time>
        <maintenance-components
          ref="maintenanceComponents"
          :updateKubernetesVersion="data.updateKubernetesVersion"
          :updateOSVersion="data.updateOSVersion"
        ></maintenance-components>
      </template>
    </confirm-dialog>
  </div>
</template>

<script>
import ConfirmDialog from '@/dialogs/ConfirmDialog'
import MaintenanceComponents from '@/components/ShootMaintenance/MaintenanceComponents'
import MaintenanceTime from '@/components/ShootMaintenance/MaintenanceTime'
import { updateShootMaintenance } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import get from 'lodash/get'
import assign from 'lodash/assign'
import { shootGetters } from '@/mixins/shootGetters'

export default {
  name: 'maintenance-configuration',
  components: {
    ConfirmDialog,
    MaintenanceComponents,
    MaintenanceTime
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  mixins: [shootGetters],
  data () {
    return {
      errorMessage: null,
      detailedErrorMessage: null,
      maintenanceTimeValid: true,
      data: {
        timeWindowBegin: undefined,
        timeWindowEnd: undefined,
        updateKubernetesVersion: false,
        updateOSVersion: false
      },
      icon: 'mdi-settings-outline',
      caption: 'Configure Maintenance'
    }
  },
  computed: {
    valid () {
      return this.maintenanceTimeValid
    }
  },
  methods: {
    async showDialog (reset = true) {
      if (await this.$refs.confirmDialog.confirmWithDialog(() => {
        if (reset) {
          this.reset()
        }
      })) {
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
          const errorDetails = errorDetailsFromError(err)
          this.errorMessage = 'Could not save maintenance configuration'
          this.detailedErrorMessage = errorDetails.detailedMessage
          console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
          this.showDialog(false)
        }
      }
    },
    reset () {
      this.errorMessage = null
      this.detailedErrorMessage = null
      this.maintenanceTimeValid = true

      this.data.timeWindowBegin = get(this.shootItem, 'spec.maintenance.timeWindow.begin')
      this.data.timeWindowEnd = get(this.shootItem, 'spec.maintenance.timeWindow.end')
      this.data.updateKubernetesVersion = get(this.shootItem, 'spec.maintenance.autoUpdate.kubernetesVersion', false)
      this.data.updateOSVersion = get(this.shootItem, 'spec.maintenance.autoUpdate.machineImageVersion', false)

      this.$nextTick(() => {
        this.$refs.maintenanceTime.reset()
        this.$refs.maintenanceComponents.reset()
      })
    },
    onMaintenanceTimeValid (value) {
      this.maintenanceTimeValid = value
    }
  }
}
</script>
