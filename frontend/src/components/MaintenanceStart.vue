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
      <v-btn slot="activator" :loading="isMaintenanceToBeScheduled" icon @click="showDialog">
        <v-icon medium>mdi-refresh</v-icon>
      </v-btn>
      <span v-if="isMaintenanceToBeScheduled">Requesting to schedule cluster maintenance</span>
      <span v-else>{{caption}}</span>
    </v-tooltip>
    <confirm-dialog
      confirmButtonText="Maintain"
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
import { addAnnotation } from '@/utils/api'
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
      osUpdates: true // won't change
    }
  },
  computed: {
    isMaintenanceToBeScheduled () {
      return get(this.shootItem, ['metadata', 'annotations', 'shoot.garden.sapcloud.io/operation']) === 'maintain'
    },
    caption () {
      return 'Maintain Cluster'
    },
    shootName () {
      return get(this.shootItem, 'metadata.name')
    },
    shootNamespace () {
      return get(this.shootItem, 'metadata.namespace')
    },
    updateKubernetesVersion () {
      return get(this.shootItem, 'spec.maintenance.autoUpdate.kubernetesVersion', false)
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
      const user = this.$store.state.user
      const maintain = { 'shoot.garden.sapcloud.io/operation': 'maintain' }
      return addAnnotation({ namespace: this.shootNamespace, name: this.shootName, user, data: maintain })
        .then(() => this.hideDialog())
        .catch((err) => {
          const msg = 'Could not start maintenance'
          this.errorMessage = msg
          this.detailedErrorMessage = err.message
          console.error(msg, err)
        })
    },
    reset () {
      this.errorMessage = null
      this.detailedErrorMessage = null
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
