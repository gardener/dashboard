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
      <v-btn slot="activator" :loading="isReconcileToBeScheduled" icon @click="showDialog" :disabled="isShootMarkedForDeletion">
        <v-icon medium>mdi-refresh</v-icon>
      </v-btn>
      <span v-if="isReconcileToBeScheduled">Requesting to schedule cluster reconcile</span>
      <span v-else>{{caption}}</span>
    </v-tooltip>
    <confirm-dialog
      confirmButtonText="Trigger Now"
      v-model="dialog"
      :cancel="hideDialog"
      :ok="triggerReconcile"
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
            <div class="subheading pt-3">Do you want to trigger reconcile of your cluster?</div>
          </v-flex>
        </v-layout>
      </template>
    </confirm-dialog>
  </div>
</template>

<script>
import ConfirmDialog from '@/dialogs/ConfirmDialog'
import { addAnnotation } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import { isShootMarkedForDeletion } from '@/utils'
import { SnotifyPosition } from 'vue-snotify'
import get from 'lodash/get'

export default {
  components: {
    ConfirmDialog
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
      reconcileTriggered: false
    }
  },
  computed: {
    isReconcileToBeScheduled () {
      // TODO we need a better way to track the Reconcile status instead of checking the operation annotation
      return get(this.shootItem, ['metadata', 'annotations', 'shoot.garden.sapcloud.io/operation']) === 'reconcile'
    },
    caption () {
      return 'Trigger Reconcile'
    },
    shootName () {
      return get(this.shootItem, 'metadata.name')
    },
    shootNamespace () {
      return get(this.shootItem, 'metadata.namespace')
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
    triggerReconcile () {
      this.reconcileTriggered = true

      const user = this.$store.state.user
      const reconcile = { 'shoot.garden.sapcloud.io/operation': 'reconcile' }
      return addAnnotation({ namespace: this.shootNamespace, name: this.shootName, user, data: reconcile })
        .then(() => this.hideDialog())
        .catch((err) => {
          const errorDetails = errorDetailsFromError(err)
          this.errorMessage = 'Could not trigger reconcile'
          this.detailedErrorMessage = errorDetails.detailedMessage
          console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)

          this.reconcileTriggered = false
        })
    },
    reset () {
      this.errorMessage = null
      this.detailedErrorMessage = null
    }
  },
  watch: {
    isReconcileToBeScheduled (reconcileToBeScheduled) {
      const isReconcileScheduled = !reconcileToBeScheduled && this.reconcileTriggered
      if (isReconcileScheduled) {
        this.reconcileTriggered = false

        if (this.shootName) { // ensure that notification is not triggered by shoot resource beeing cleared (e.g. during navigation)
          const config = {
            position: SnotifyPosition.rightBottom,
            timeout: 5000,
            showProgressBar: false
          }
          this.$snotify.success(`Reconcile triggered for ${this.shootName}`, config)
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
