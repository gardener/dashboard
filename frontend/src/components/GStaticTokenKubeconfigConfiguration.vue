<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    width="500"
    confirm-required
    caption="Configure Static Token Kubeconfig"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <v-card-text>
        <g-static-token-kubeconfig-switch
          v-model="enableStaticTokenKubeconfig"
        />
      </v-card-text>
    </template>
  </g-action-button-dialog>
</template>

<script>
import { ref } from 'vue'

import { useShootItem } from '@/composables/useShootItem'

import { errorDetailsFromError } from '@/utils/error'

import GActionButtonDialog from './dialogs/GActionButtonDialog.vue'
import GStaticTokenKubeconfigSwitch from './GStaticTokenKubeconfigSwitch.vue'

export default {
  components: {
    GActionButtonDialog,
    GStaticTokenKubeconfigSwitch,
  },
  inject: ['api', 'logger'],
  setup () {
    const {
      shootNamespace,
      shootName,
      shootEnableStaticTokenKubeconfig,
    } = useShootItem()

    const enableStaticTokenKubeconfig = ref(shootEnableStaticTokenKubeconfig.value)

    return {
      shootNamespace,
      shootName,
      shootEnableStaticTokenKubeconfig,
      enableStaticTokenKubeconfig,
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
      this.enableStaticTokenKubeconfig = this.shootEnableStaticTokenKubeconfig
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
  },
}
</script>
