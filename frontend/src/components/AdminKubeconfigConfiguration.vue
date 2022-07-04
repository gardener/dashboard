<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <action-button-dialog
    :shoot-item="shootItem"
    @dialog-opened="onConfigurationDialogOpened"
    ref="actionDialog"
    width="450"
    caption="Configure Admin Kubeconfig">
    <template v-slot:actionComponent>
      <admin-kubeconfig
        v-model="enableStaticTokenKubeconfig"
      ></admin-kubeconfig>
    </template>
  </action-button-dialog>
</template>

<script>
import ActionButtonDialog from '@/components/dialogs/ActionButtonDialog'
import AdminKubeconfig from '@/components/AdminKubeconfig'
import { updateShootEnableStaticTokenKubeconfig } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import shootItem from '@/mixins/shootItem'

export default {
  name: 'admin-kubeconfig-configuration',
  components: {
    ActionButtonDialog,
    AdminKubeconfig
  },
  mixins: [
    shootItem
  ],
  data () {
    return {
      enableStaticTokenKubeconfig: undefined
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
      await this.reset()
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
    async reset () {
      this.enableStaticTokenKubeconfig = this.shootEnableStaticTokenKubeconfig
    }
  }
}
</script>
