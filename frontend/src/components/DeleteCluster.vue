<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
    @dialogOpened="onDeleteDialogOpened"
    ref="actionDialog"
    :caption="caption"
    icon="delete"
    :iconColor="iconColor"
    dialogColor="red"
    confirmButtonText="Delete"
    confirm-required
    :smallIcon="small"
    maxWidth="600"
  >
    <template v-slot:actionComponent>
      <v-list>
        <v-list-item-content>
          <v-list-item-subtitle>
            Created By
          </v-list-item-subtitle>
          <v-list-item-title>
            <account-avatar :account-name="shootCreatedBy" :size="22"></account-avatar>
          </v-list-item-title>
        </v-list-item-content>
      </v-list>
      <p>
        Type <b>{{shootName}}</b> below and confirm the deletion of the cluster and all of its content.
      </p>
      <p>
        <i class="red--text text--darken-2">This action cannot be undone.</i>
      </p>
      <p v-if="isShootReconciliationDeactivated">
        <v-row class="fill-height" >
          <v-icon color="orange" class="mr-1">mdi-alert-box</v-icon>
          <span>The cluster will not be deleted as long as reconciliation is deactivated.</span>
        </v-row>
      </p>
    </template>
  </action-icon-dialog>
</template>

<script>
import AccountAvatar from '@/components/AccountAvatar'
import ActionIconDialog from '@/components/dialogs/ActionIconDialog'
import { mapActions } from 'vuex'
import { errorDetailsFromError } from '@/utils/error'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    ActionIconDialog,
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
    iconColor: {
      type: String
    }
  },
  mixins: [shootItem],
  data () {
    return {
      renderDialog: false,
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
    }
  },
  methods: {
    async onDeleteDialogOpened () {
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.doDeleteCluster()
      }
    },
    async doDeleteCluster () {
      try {
        await this.deleteShoot({ name: this.shootName, namespace: this.shootNamespace })
      } catch (err) {
        const errorMessage = 'Cluster deletion failed'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    ...mapActions([
      'deleteShoot'
    ])
  }
}
</script>

<style lang="scss" scoped>
  p {
    margin-bottom: 0
  }
</style>
