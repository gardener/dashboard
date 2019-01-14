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
      <v-btn
        slot="activator"
        icon
        :small="small"
        :disabled="isShootMarkedForDeletion"
        :class="contentClass"
        @click="renderAndShowDialog"
      >
        <v-icon>delete</v-icon>
      </v-btn>
      <span>{{caption}}</span>
    </v-tooltip>

    <template v-if="renderDialog">
      <confirm-dialog
        :confirm="shootName"
        v-model="dialog"
        :cancel="hideDialog"
        :ok="deletionConfirmed"
        :errorMessage.sync="errorMessage"
        :detailedErrorMessage.sync="detailedErrorMessage"
      >
        <template slot="caption">Delete Cluster</template>
        <template slot="affectedObjectName">{{shootName}}</template>
        <template slot="message">
          <v-list>
            <v-list-tile-content>
              <v-list-tile-sub-title>
                Created By
              </v-list-tile-sub-title>
              <v-list-tile-title>
                <account-avatar :account-name="createdBy" :size="22"></account-avatar>
              </v-list-tile-title>
            </v-list-tile-content>
          </v-list>
          <p>
            Type <b>{{shootName}}</b> below and confirm the deletion of the cluster and all of its content.
          </p>
          <p>
            <i class="red--text text--darken-2">This action cannot be undone.</i>
          </p>
          <p v-if="isReconciliationDeactivated()">
            <v-layout row fill-height>
              <v-icon color="orange" class="mr-1">mdi-alert-box</v-icon>
              <span>The cluster will not be deleted as long as reconciliation is deactivated.</span>
            </v-layout>
          </p>
        </template>
      </confirm-dialog>
    </template>
  </div>
</template>

<script>
import AccountAvatar from '@/components/AccountAvatar'
import ConfirmDialog from '@/dialogs/ConfirmDialog'
import get from 'lodash/get'
import { mapActions } from 'vuex'
import { errorDetailsFromError } from '@/utils/error'
import {
  getCreatedBy,
  isShootMarkedForDeletion,
  isReconciliationDeactivated
} from '@/utils'

export default {
  components: {
    ConfirmDialog,
    AccountAvatar
  },
  props: {
    shootItem: {
      type: Object
    },
    small: {
      type: Boolean,
      default: false
    },
    contentClass: {
      type: String,
      default: undefined
    }
  },
  data () {
    return {
      renderDialog: false,
      dialog: false,
      errorMessage: null,
      detailedErrorMessage: null
    }
  },
  computed: {
    icon () {
      return 'mdi-delete'
    },
    caption () {
      return this.isShootMarkedForDeletion
        ? 'Cluster already marked for deletion'
        : 'Delete Cluster'
    },
    shootName () {
      return get(this.shootItem, 'metadata.name')
    },
    shootNamespace () {
      return get(this.shootItem, 'metadata.namespace')
    },
    createdBy () {
      return getCreatedBy(get(this.shootItem, 'metadata'))
    },
    isShootMarkedForDeletion () {
      return isShootMarkedForDeletion(get(this.shootItem, 'metadata'))
    }
  },
  methods: {
    renderAndShowDialog () {
      // as this component is potentially embedded in a list with many items we only want to render the dialog on demand
      this.renderDialog = true

      this.$nextTick(() => {
        this.showDialog()
      })
    },
    showDialog () {
      this.dialog = true
      this.reset()
    },
    hideDialog () {
      this.dialog = false
    },
    ...mapActions([
      'deleteShoot'
    ]),
    deletionConfirmed () {
      this.deleteShoot({ name: this.shootName, namespace: this.shootNamespace })
        .then(() => this.hideDialog())
        .catch((err) => {
          const errorDetails = errorDetailsFromError(err)
          this.errorMessage = 'Cluster deletion failed'
          this.detailedErrorMessage = errorDetails.detailedMessage
          console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
        })
    },
    isReconciliationDeactivated () {
      return isReconciliationDeactivated(get(this.shootItem, 'metadata'))
    },
    reset () {
      this.errorMessage = null
      this.detailedErrorMessage = null
    }
  }
}
</script>

<style lang="styl" scoped>
  p {
    margin-bottom: 0
  }
</style>
