<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    caption="Configure Add-ons"
    width="900"
    max-height="60vh"
    @before-dialog-opened="setShootManifest(shootItem)"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <v-card-text>
        <g-manage-shoot-addons />
      </v-card-text>
    </template>
  </g-action-button-dialog>
</template>

<script>
import { storeToRefs } from 'pinia'

import { useShootContextStore } from '@/store/shootContext'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'
import GManageShootAddons from '@/components/ShootAddons/GManageAddons'

import { useShootItem } from '@/composables/useShootItem'

import { errorDetailsFromError } from '@/utils/error'

export default {
  components: {
    GActionButtonDialog,
    GManageShootAddons,
  },
  inject: ['api', 'logger'],
  setup () {
    const {
      shootItem,
      shootNamespace,
      shootName,
    } = useShootItem()

    const shootContextStore = useShootContextStore()
    const {
      addons,
    } = storeToRefs(shootContextStore)
    const {
      setShootManifest,
    } = shootContextStore

    return {
      shootItem,
      shootNamespace,
      shootName,
      addons,
      setShootManifest,
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.updateConfiguration()
      }
    },
    async updateConfiguration () {
      try {
        await this.api.updateShootAddons({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: this.addons,
        })
      } catch (err) {
        const errorMessage = 'Could not update addons'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
  },
}
</script>
