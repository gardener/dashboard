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
      confirmColor="orange"
      defaultColor="orange"
      max-width=1000
      ref="confirmDialog"
      >
      <template slot="caption">{{caption}}</template>
      <template slot="affectedObjectName">{{shootName}}</template>
      <template slot="message">
        <manage-workers
        ref="manageWorkers"
        @valid="onWorkersValid"
       ></manage-workers>
      </template>
    </confirm-dialog>
  </div>
</template>

<script>
import ConfirmDialog from '@/dialogs/ConfirmDialog'
import ManageWorkers from '@/components/ManageWorkers'
import { updateShootWorkers } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import { shootGetters } from '@/mixins/shootGetters'

export default {
  name: 'worker-configuration',
  components: {
    ConfirmDialog,
    ManageWorkers
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  data () {
    return {
      errorMessage: null,
      detailedErrorMessage: null,
      workersValid: false,
      workers: undefined,
      icon: 'mdi-settings-outline',
      caption: 'Configure Workers'
    }
  },
  mixins: [shootGetters],
  computed: {
    valid () {
      return this.workersValid
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
          this.workers = this.$refs.manageWorkers.getWorkers()
          await updateShootWorkers({ namespace: this.shootNamespace, name: this.shootName, infrastructureKind: this.shootCloudProviderKind, data: this.workers })
        } catch (err) {
          const errorDetails = errorDetailsFromError(err)
          this.errorMessage = 'Could not save worker configuration'
          this.detailedErrorMessage = errorDetails.detailedMessage
          console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
          this.showDialog(false)
        }
      }
    },
    reset () {
      this.errorMessage = null
      this.detailedErrorMessage = null
      this.workersValid = false

      const workers = this.shootWorkerGroups
      this.$nextTick(() => {
        this.$refs.manageWorkers.setWorkersData({ workers, cloudProfileName: this.shootCloudProfileName, zones: this.shootZones })
      })
    },
    onWorkersValid (value) {
      this.workersValid = value
    }
  }
}
</script>
