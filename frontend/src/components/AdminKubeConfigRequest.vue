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
    caption="Configure Kubeconfig Lifetime">
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
      possibleExpirationSettings: ['30m', '1h', '3h', '6h', '12h', '1d'],
      kubeconfigExpiration: undefined
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
      this.reset()
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        await this.updateKubeconfigExpiration()
      }
    },
    async updateKubeconfigExpiration () {
      this.$emit('kubeconfigExpirationUpdate', this.kubeconfigExpiration)
    },
    reset () {
      if (!this.kubeconfigExpiration) {
        this.kubeconfigExpiration = this.possibleExpirationSettings[0]
      }
    }
  }
}
</script>
