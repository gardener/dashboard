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
      <v-btn slot="activator" icon @click="showDialog" :disabled="isShootMarkedForDeletion">
        <v-icon medium>{{icon}}</v-icon>
      </v-btn>
      {{caption}}
    </v-tooltip>
    <confirm-dialog
      confirmButtonText="Save"
      :confirm-disabled="!valid"
      v-model="dialog"
      :cancel="hideDialog"
      :ok="updateMaintenance"
      :errorMessage.sync="errorMessage"
      :detailedErrorMessage.sync="detailedErrorMessage"
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
          @updateMaintenanceWindow="onUpdateMaintenanceWindow"
          @valid="onMaintenanceTimeValid"
        ></maintenance-time>
        <maintenance-components
          :update-kubernetes-version="data.updateKubernetesVersion"
          @updateKubernetesVersion="onUpdateKubernetesVersion">
        </maintenance-components>
      </template>
    </confirm-dialog>
  </div>
</template>

<script>
import ConfirmDialog from '@/dialogs/ConfirmDialog'
import MaintenanceComponents from '@/components/MaintenanceComponents'
import MaintenanceTime from '@/components/MaintenanceTime'
import { updateShootMaintenance } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import { isShootMarkedForDeletion } from '@/utils'
import get from 'lodash/get'

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
  data () {
    return {
      dialog: false,
      errorMessage: null,
      detailedErrorMessage: null,
      maintenanceTimeValid: false,
      data: {
        timeWindowBegin: undefined,
        timeWindowEnd: undefined,
        updateKubernetesVersion: false
      },
      icon: 'mdi-settings-outline',
      caption: 'Configure Maintenance'
    }
  },
  computed: {
    shootName () {
      return get(this.shootItem, 'metadata.name')
    },
    shootNamespace () {
      return get(this.shootItem, 'metadata.namespace')
    },
    valid () {
      return this.maintenanceTimeValid
    },
    isShootMarkedForDeletion () {
      return isShootMarkedForDeletion(get(this.shootItem, 'metadata'))
    }
  },
  methods: {
    showDialog () {
      this.dialog = true

      this.reset()
    },
    hideDialog () {
      this.dialog = false
    },
    async updateMaintenance () {
      try {
        await updateShootMaintenance({ namespace: this.shootNamespace, name: this.shootName, data: this.data })
        this.hideDialog()
      } catch (err) {
        const errorDetails = errorDetailsFromError(err)
        this.errorMessage = 'Could not save maintenance configuration'
        this.detailedErrorMessage = errorDetails.detailedMessage
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    reset () {
      this.errorMessage = null
      this.detailedErrorMessage = null
      this.maintenanceTimeValid = false

      this.data.timeWindowBegin = get(this.shootItem, 'spec.maintenance.timeWindow.begin')
      this.data.timeWindowEnd = get(this.shootItem, 'spec.maintenance.timeWindow.end')
      this.data.updateKubernetesVersion = get(this.shootItem, 'spec.maintenance.autoUpdate.kubernetesVersion', false)

      this.$nextTick(() => {
        this.$refs.maintenanceTime.reset()
      })
    },
    onUpdateKubernetesVersion (value) {
      this.data.updateKubernetesVersion = value
    },
    onUpdateMaintenanceWindow ({ utcBegin, utcEnd }) {
      this.data.timeWindowBegin = utcBegin
      this.data.timeWindowEnd = utcEnd
    },
    onMaintenanceTimeValid (value) {
      this.maintenanceTimeValid = value
    }
  }
}
</script>
