<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    :shoot-item="shootItem"
    ref="actionDialog"
    width="500"
    confirm-required
    caption="Configure Static Token Kubeconfig"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template v-slot:actionComponent>
      <g-static-token-kubeconfig-switch
        v-model="enableStaticTokenKubeconfig"
      />
    </template>
  </g-action-button-dialog>
</template>

<script>
import { defineComponent } from 'vue'

import GActionButtonDialog from './dialogs/GActionButtonDialog.vue'
import GStaticTokenKubeconfigSwitch from './GStaticTokenKubeconfigSwitch.vue'

import shootItem from '@/mixins/shootItem'

import { errorDetailsFromError } from '@/utils/error'

export default defineComponent({
  components: {
    GActionButtonDialog,
    GStaticTokenKubeconfigSwitch,
  },
  mixins: [
    shootItem,
  ],
  inject: ['api', 'logger'],
  data () {
    return {
      enableStaticTokenKubeconfig: this.shootEnableStaticTokenKubeconfig,
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
      this.reset()
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        await this.updateConfiguration()
      }
    },
    async updateConfiguration () {
      try {
        await this.api.updateShootEnableStaticTokenKubeconfig({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: {
            enableStaticTokenKubeconfig: this.enableStaticTokenKubeconfig,
          },
        })
      } catch (err) {
        const errorMessage = 'Could not update static kubeconfig flag'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    reset () {
      this.enableStaticTokenKubeconfig = this.shootEnableStaticTokenKubeconfig
    },
  },
})
</script>
