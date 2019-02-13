<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
      <v-btn slot="activator" :loading="isMaintenanceToBeScheduled" icon @click="showDialog" :disabled="isShootMarkedForDeletion">
        <v-icon medium>mdi-refresh</v-icon>
      </v-btn>
      <span v-if="isMaintenanceToBeScheduled">Requesting to schedule cluster maintenance</span>
      <span v-else>{{caption}}</span>
    </v-tooltip>
    <confirm-dialog
      confirmButtonText="Schedule Now"
      v-model="dialog"
      :cancel="hideDialog"
      :ok="triggerMaintenance"
      :errorMessage.sync="errorMessage"
      :detailedErrorMessage.sync="detailedErrorMessage"
      confirmColor="orange"
      defaultColor="orange"
      max-width="850"
      >
      <template slot="caption">{{caption}}</template>
      <template slot="affectedObjectName">{{shootName}}</template>
      <template slot="message">
        <v-layout row wrap>
          <v-flex>
            <div class="subheading pt-3">Do you want to start the maintenance of your cluster outside of the configured maintenance time window?</div>
          </v-flex>
          <maintenance-components
            title="The following updates will be performed"
            :update-kubernetes-version="updateKubernetesVersion"
            :selectable="false"
          ></maintenance-components>
        </v-layout>
      </template>
    </confirm-dialog>
  </div>
</template>

<script>
import ConfirmDialog from '@/dialogs/ConfirmDialog'
import MaintenanceComponents from '@/components/MaintenanceComponents'
import { addShootAnnotation } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import { isShootMarkedForDeletion } from '@/utils'
import { SnotifyPosition } from 'vue-snotify'
import get from 'lodash/get'

export default {
  components: {
    ConfirmDialog,
    MaintenanceComponents
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
      osUpdates: true, // won't change
      maintenanceTriggered: false
    }
  },
  computed: {
    isMaintenanceToBeScheduled () {
      // TODO we need a better way to track the maintenance status instead of checking the operation annotation
      return get(this.shootItem, ['metadata', 'annotations', 'shoot.garden.sapcloud.io/operation']) === 'maintain'
    },
    caption () {
      return 'Schedule Maintenance'
    },
    shootName () {
      return get(this.shootItem, 'metadata.name')
    },
    shootNamespace () {
      return get(this.shootItem, 'metadata.namespace')
    },
    updateKubernetesVersion () {
      return get(this.shootItem, 'spec.maintenance.autoUpdate.kubernetesVersion', false)
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
    triggerMaintenance () {
      this.maintenanceTriggered = true

      const user = this.$store.state.user
      const maintain = { 'shoot.garden.sapcloud.io/operation': 'maintain' }
      return addShootAnnotation({ namespace: this.shootNamespace, name: this.shootName, user, data: maintain })
        .then(() => this.hideDialog())
        .catch((err) => {
          const errorDetails = errorDetailsFromError(err)
          this.errorMessage = 'Could not start maintenance'
          this.detailedErrorMessage = errorDetails.detailedMessage
          console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)

          this.maintenanceTriggered = false
        })
    },
    reset () {
      this.errorMessage = null
      this.detailedErrorMessage = null
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
