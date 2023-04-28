<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <action-button-dialog
    :shoot-item="shootItem"
    @dialog-opened="onConfigurationDialogOpened"
    ref="actionDialog"
    width="500"
    confirm-required
    caption="Configure Static Token Kubeconfig">
    <template v-slot:actionComponent>
      <static-token-kubeconfig-switch
        v-model="enableStaticTokenKubeconfig"
      ></static-token-kubeconfig-switch>
    </template>
  </action-button-dialog>
</template>

<script>
import ActionButtonDialog from '@/components/dialogs/ActionButtonDialog.vue'
import StaticTokenKubeconfigSwitch from '@/components/StaticTokenKubeconfigSwitch.vue'
import { updateShootEnableStaticTokenKubeconfig } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import shootItem from '@/mixins/shootItem'

export default {
  name: 'static-token-kubeconfig-configuration',
  components: {
    ActionButtonDialog,
    StaticTokenKubeconfigSwitch
  },
  mixins: [
    shootItem
  ],
  data () {
    return {
      enableStaticTokenKubeconfig: this.shootEnableStaticTokenKubeconfig
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
        await updateShootEnableStaticTokenKubeconfig({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: {
            enableStaticTokenKubeconfig: this.enableStaticTokenKubeconfig
          }
        })
      } catch (err) {
        const errorMessage = 'Could not update static kubeconfig flag'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    reset () {
      this.enableStaticTokenKubeconfig = this.shootEnableStaticTokenKubeconfig
    }
  }
}
</script>
