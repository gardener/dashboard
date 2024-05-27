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
    confirm-button-text="Force Delete"
    confirm-required
    icon="mdi-delete-forever"
    ignore-deletion-status
    :disabled="isShootMarkedForForceDeletion"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <v-card-text>
        <g-force-delete-cluster />
      </v-card-text>
    </template>
  </g-action-button-dialog>
</template>

<script>
import { computed } from 'vue'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog.vue'
import GForceDeleteCluster from '@/components/GForceDeleteCluster.vue'

import { useShootItem } from '@/composables/useShootItem'

import { errorDetailsFromError } from '@/utils/error'

export default {
  components: {
    GActionButtonDialog,
    GForceDeleteCluster,
  },
  inject: ['logger', 'api'],
  props: {
    text: {
      type: Boolean,
      default: false,
    },
  },
  setup (props) {
    const {
      shootNamespace,
      shootName,
      isShootMarkedForForceDeletion,
    } = useShootItem()

    const caption = computed(() => {
      if (isShootMarkedForForceDeletion.value) {
        return 'Cluster already marked for force deletion'
      }
      return buttonTitle.value
    })

    const buttonTitle = computed(() => {
      return 'Force Delete Cluster'
    })

    const buttonText = computed(() => {
      if (!props.text) {
        return
      }
      return buttonTitle.value
    })

    return {
      shootNamespace,
      shootName,
      isShootMarkedForForceDeletion,
      caption,
      buttonText,
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.addForceDeletionAnnotation()
      }
    },
    async addForceDeletionAnnotation () {
      const annotations = {
        'confirmation.gardener.cloud/force-deletion': 'true',
      }
      try {
        await this.api.addShootAnnotation({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: annotations,
        })
      } catch (err) {
        const errorMessage = 'Cluster force deletion failed'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
  },
}
</script>
