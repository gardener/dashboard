<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    :shoot-item="shootItem"
    :valid="dnsConfigurationValid"
    ref="actionDialog"
    caption="Configure DNS"
    width="900"
    confirm-required
    @dialog-opened="onConfigurationDialogOpened"
    >
    <template #actionComponent>
      <g-manage-shoot-dns :key="componentKey"/>
    </template>
  </g-action-button-dialog>
</template>

<script>
import { defineComponent } from 'vue'

import { mapActions, mapGetters } from 'pinia'
import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'
import GManageShootDns from '@/components/ShootDns/GManageDns'
import { updateShootDns } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import { shootItem } from '@/mixins/shootItem'
import { v4 as uuidv4 } from '@/utils/uuid'

import {
  useShootStagingStore,
} from '@/store'

export default defineComponent({
  mixins: [shootItem],
  components: {
    GActionButtonDialog,
    GManageShootDns,
  },
  data () {
    return {
      componentKey: uuidv4(),
    }
  },
  computed: {
    ...mapGetters(useShootStagingStore, [
      'getDnsConfiguration',
      'dnsConfigurationValid',
    ]),
  },
  methods: {
    ...mapActions(useShootStagingStore, [
      'setClusterConfiguration',
    ]),
    async onConfigurationDialogOpened () {
      this.reset()
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.updateConfiguration()
      }
    },
    async updateConfiguration () {
      try {
        const namespace = this.shootNamespace
        const name = this.shootName
        const data = this.getDnsConfiguration()
        await updateShootDns({ namespace, name, data })
      } catch (err) {
        const errorMessage = 'Could not update DNS Configuration'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    reset () {
      this.setClusterConfiguration(this.shootItem)
      this.componentKey = uuidv4() // force re-render
    },
  },
})
</script>