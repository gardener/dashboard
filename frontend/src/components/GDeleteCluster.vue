<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    :shoot-item="shootItem"
    @dialog-opened="onDeleteDialogOpened"
    ref="actionDialog"
    :caption="caption"
    icon="mdi-delete"
    confirm-button-text="Delete"
    confirm-required
    :button-text="buttonText"
    :small-icon="small"
    width="600"
  >
    <template v-slot:actionComponent>
      <v-list>
        <v-list-item-subtitle>
          Created By
        </v-list-item-subtitle>
        <v-list-item-title>
          <g-account-avatar :account-name="shootCreatedBy" :size="22"/>
        </v-list-item-title>
      </v-list>
      <p>
        Type <span class="font-weight-bold">{{shootName}}</span> below and confirm the deletion of the cluster and all of its content.
      </p>
      <p class="mt-2 text-error font-weight-bold">
        This action cannot be undone.
      </p>
      <p v-if="isShootReconciliationDeactivated">
        <v-row class="fill-height" >
          <v-icon color="warning" class="mr-1">mdi-alert-box</v-icon>
          <span>The cluster will not be deleted as long as reconciliation is deactivated.</span>
        </v-row>
      </p>
    </template>
  </g-action-button-dialog>
</template>

<script>
import { defineComponent } from 'vue'
import { mapActions } from 'pinia'

import { useShootStore } from '@/store'

import GAccountAvatar from '@/components/GAccountAvatar.vue'
import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog.vue'

import { errorDetailsFromError } from '@/utils/error'
import { shootItem } from '@/mixins/shootItem'

export default defineComponent({
  components: {
    GActionButtonDialog,
    GAccountAvatar,
  },
  props: {
    small: {
      type: Boolean,
      default: false,
    },
    text: {
      type: Boolean,
    },
  },
  mixins: [shootItem],
  data () {
    return {
      renderDialog: false,
      errorMessage: null,
      detailedErrorMessage: null,
    }
  },
  computed: {
    icon () {
      return 'mdi-delete'
    },
    caption () {
      return this.isShootMarkedForDeletion
        ? 'Cluster already marked for deletion'
        : this.buttonTitle
    },
    buttonTitle () {
      return 'Delete Cluster'
    },
    buttonText () {
      if (!this.text) {
        return
      }
      return this.buttonTitle
    },
  },
  methods: {
    ...mapActions(useShootStore, [
      'deleteShoot',
    ]),
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

  },
})
</script>

<style lang="scss" scoped>
  p {
    margin-bottom: 0
  }
</style>
