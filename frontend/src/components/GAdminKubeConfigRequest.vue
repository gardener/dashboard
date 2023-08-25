<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    :shoot-item="shootItem"
    @dialog-opened="onConfigurationDialogOpened"
    ref="actionDialog"
    width="500"
    caption="Configure Kubeconfig Lifetime">
    <template v-slot:actionComponent>
      <g-wildcard-select
        v-model="expiration"
        :wildcard-select-items="expirations"
        wildcard-select-label="Lifetime"
        ></g-wildcard-select>
    </template>
  </g-action-button-dialog>
</template>

<script>
import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'
import GWildcardSelect from '@/components/GWildcardSelect'
import shootItem from '@/mixins/shootItem'

export default {
  components: {
    GActionButtonDialog,
    GWildcardSelect
  },
  mixins: [
    shootItem
  ],
  data () {
    return {
      expiration: undefined
    }
  },
  props: {
    expirations: {
      type: Array
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
      this.reset()
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.$emit('expirationUpdate', this.expiration)
      }
    },
    reset () {
      this.expiration = this.expirations[0]
    }
  }
}
</script>
