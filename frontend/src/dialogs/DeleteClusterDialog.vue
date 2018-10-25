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
  <confirm-dialog
    :confirm="clusterName"
    v-model="value"
    :cancel="hideDialog"
    :ok="deletionConfirmed"
    :errorMessage.sync="deleteErrorMessage"
    :detailedErrorMessage.sync="deleteDetailedErrorMessage"
    >
    <template slot="caption">Delete Cluster</template>
    <template slot="affectedObjectName">{{clusterName}}</template>
    <template slot="message">
      <v-list>
        <v-list-tile-content>
          <v-list-tile-sub-title>
            Created By
          </v-list-tile-sub-title>
          <v-list-tile-title>
            <account-avatar :account-name="clusterCreatedBy" size=22></account-avatar>
          </v-list-tile-title>
        </v-list-tile-content>
      </v-list>
      <br />
      Type <b>{{clusterName}}</b> below and confirm the deletion of the cluster and all of its content.
      <br/>
      <i class="red--text text--darken-2">This action cannot be undone.</i>
    </template>
  </confirm-dialog>
</template>

<script>
import AccountAvatar from '@/components/AccountAvatar'
import ConfirmDialog from '@/dialogs/ConfirmDialog'
import { mapActions } from 'vuex'

export default {
  name: 'delete-cluster-dialog',
  components: {
    AccountAvatar,
    ConfirmDialog
  },
  props: {
    value: {
      type: Boolean
    },
    clusterName: {
      type: String
    },
    clusterNamespace: {
      type: String
    },
    clusterCreatedBy: {
      type: String
    }
  },
  data () {
    return {
      deleteErrorMessage: null,
      deleteDetailedErrorMessage: null
    }
  },
  methods: {
    ...mapActions([
      'deleteShoot'
    ]),
    deletionConfirmed () {
      this.deleteShoot({ name: this.clusterName, namespace: this.clusterNamespace })
        .then(() => this.hideDialog())
        .catch((err) => {
          this.deleteErrorMessage = 'Cluster deletion failed'
          this.deleteDetailedErrorMessage = err.message
          console.error('Delete shoot failed with error:', err)
        })
    },
    hideDialog () {
      this.deleteErrorMessage = null
      this.deleteDetailedErrorMessage = null
      this.$emit('close', true)
    }
  }
}
</script>
