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
    caption="Configure Kubeconfig Lifetime ">
    <template v-slot:actionComponent>
      <wildcard-select
        v-model="kubeconfigExpiration"
        :wildcard-select-items="possibleExpirationSettings"
        wildcard-select-label="Lifetime"
        ></wildcard-select>
    </template>
  </action-button-dialog>
</template>

<script>
import ActionButtonDialog from '@/components/dialogs/ActionButtonDialog'
import WildcardSelect from '@/components/WildcardSelect'
import { createAdminKubeconfig } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import shootItem from '@/mixins/shootItem'

export default {
  name: 'admin-kubeconfig-request',
  components: {
    ActionButtonDialog,
    WildcardSelect
  },
  mixins: [
    shootItem
  ],
  data () {
    return {
      possibleExpirationSettings: ['1800 (30m)', '3600 (1h)', '10800 (3h)', '10800 (6h)', '43200 (12h)', '86400 (1d)', '259200 (3d)', '604800 (7d)'],
      kubeconfigExpiration: undefined
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
      this.reset()
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        await this.requestKubeconfig()
      }
    },
    async requestKubeconfig () {
      const expirationSeconds = parseInt(this.kubeconfigExpiration.split(' ')[0])

      try {
        const resp = await createAdminKubeconfig({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: {
            expirationSeconds: expirationSeconds
          }
        })

        const kubeconfig = Buffer.from(resp.data.status.kubeconfig, 'base64').toString('utf8')
        this.$emit('adminKubeConfig', kubeconfig)
      } catch (err) {
        const errorMessage = 'Could not request admin kubeconfig'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    reset () {
      this.kubeconfigExpiration = this.possibleExpirationSettings[0]
    }
  }
}
</script>
