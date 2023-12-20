<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    :shoot-item="shootItem"
    width="500"
    caption="Configure Kubeconfig Lifetime"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #actionComponent>
      <g-wildcard-select
        v-model="expiration"
        :wildcard-select-items="expirations"
        wildcard-select-label="Lifetime"
      />
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
    GWildcardSelect,
  },
  mixins: [
    shootItem,
  ],
  props: {
    expirations: {
      type: Array,
    },
  },
  emits: [
    'update:expiration',
  ],
  data () {
    return {
      expiration: undefined,
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
      this.reset()
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.$emit('update:expiration', this.expiration)
      }
    },
    reset () {
      this.expiration = this.expirations[0]
    },
  },
}
</script>
