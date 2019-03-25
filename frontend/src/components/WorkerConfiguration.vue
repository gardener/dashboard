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
      :ok="updateWorkers"
      :errorMessage.sync="errorMessage"
      :detailedErrorMessage.sync="detailedErrorMessage"
      confirmColor="orange"
      defaultColor="orange"
      max-width=1000
      >
      <template slot="caption">{{caption}}</template>
      <template slot="affectedObjectName">{{shootName}}</template>
      <template slot="message">
        <manage-workers
        ref="manageWorkers"
        :workers="workers"
        :infrastructureKind="infrastructureKind"
        :cloudProfileName="cloudProfileName"
        @valid="onWorkersValid"
       ></manage-workers>
      </template>
    </confirm-dialog>
  </div>
</template>

<script>
import ConfirmDialog from '@/dialogs/ConfirmDialog'
import ManageWorkers from '@/components/ManageWorkers'
import { updateWorkers } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import { isShootMarkedForDeletion, getCloudProviderKind } from '@/utils'
import get from 'lodash/get'

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
      dialog: false,
      errorMessage: null,
      detailedErrorMessage: null,
      workersValid: false,
      workers: undefined,
      icon: 'mdi-settings-outline',
      caption: 'Configure Workers'
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
      return this.workersValid
    },
    isShootMarkedForDeletion () {
      return isShootMarkedForDeletion(get(this.shootItem, 'metadata'))
    },
    infrastructureKind () {
      return getCloudProviderKind(get(this.shootItem, 'spec.cloud'))
    },
    cloudProfileName () {
      return get(this.shootItem, 'spec.cloud.profile')
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
    async updateWorkers () {
      try {
        const user = this.$store.state.user
        this.workers = this.$refs.manageWorkers.getWorkers()
        await updateWorkers({ namespace: this.shootNamespace, name: this.shootName, user, infrastructureKind: this.infrastructureKind, data: this.workers })
        this.hideDialog()
      } catch (err) {
        const errorDetails = errorDetailsFromError(err)
        this.errorMessage = 'Could not save worker configuration'
        this.detailedErrorMessage = errorDetails.detailedMessage
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    reset () {
      this.errorMessage = null
      this.detailedErrorMessage = null
      this.workersValid = false

      this.workers = get(this.shootItem, `spec.cloud.${this.infrastructureKind}.workers`)

      this.$nextTick(() => {
        this.$refs.manageWorkers.reset()
      })
    },
    onWorkersValid (value) {
      this.workersValid = value
    }
  }
}
</script>
