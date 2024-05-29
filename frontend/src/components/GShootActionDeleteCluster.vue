<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    width="600"
    :caption="caption"
    :text="buttonText"
    confirm-button-text="Delete"
    confirm-required
    icon="mdi-delete"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <v-card-text>
        <div>
          Created By
          <g-account-avatar
            :account-name="shootCreatedBy "
            :size="22"
            class="my-2"
          />
        </div>
        <div class="mt-2">
          Type <span class="font-weight-bold">{{ shootName }}</span> below and confirm the deletion of the cluster and all of its content.
        </div>
        <div class="mb-2 font-weight-bold">
          This action cannot be undone.
        </div>
        <v-alert
          v-if="isShootReconciliationDeactivated"
          class="my-2"
          type="warning"
        >
          <span>The cluster will not be deleted as long as reconciliation is deactivated.</span>
        </v-alert>
      </v-card-text>
    </template>
  </g-action-button-dialog>
</template>

<script>
import { computed } from 'vue'

import { useShootStore } from '@/store/shoot'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog.vue'
import GAccountAvatar from '@/components/GAccountAvatar.vue'

import { useShootItem } from '@/composables/useShootItem'

import { errorDetailsFromError } from '@/utils/error'

export default {
  components: {
    GActionButtonDialog,
    GAccountAvatar,
  },
  inject: ['logger'],
  props: {
    text: {
      type: Boolean,
      default: false,
    },
  },
  setup (props) {
    const {
      shootItem,
      shootNamespace,
      shootName,
      shootCreatedBy,
      isShootMarkedForDeletion,
      isShootReconciliationDeactivated,
    } = useShootItem()

    const caption = computed(() => {
      if (isShootMarkedForDeletion.value) {
        return 'Cluster already marked for deletion'
      }
      return buttonTitle.value
    })

    const buttonTitle = computed(() => {
      return 'Delete Cluster'
    })

    const buttonText = computed(() => {
      if (!props.text) {
        return
      }
      return buttonTitle.value
    })

    const shootStore = useShootStore()
    const {
      deleteShoot,
    } = shootStore

    return {
      shootItem,
      shootNamespace,
      shootName,
      shootCreatedBy,
      isShootMarkedForDeletion,
      isShootReconciliationDeactivated,
      caption,
      buttonText,
      deleteShoot,
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.deleteCluster()
      }
    },
    async deleteCluster () {
      try {
        await this.deleteShoot({
          name: this.shootName,
          namespace: this.shootNamespace,
        })
      } catch (err) {
        const errorMessage = 'Cluster deletion failed'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
  },
}
</script>
