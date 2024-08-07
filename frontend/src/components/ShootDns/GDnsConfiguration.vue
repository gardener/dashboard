<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    caption="Configure DNS"
    width="900"
    confirm-required
    @before-dialog-opened="setShootManifest(shootItem)"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <v-card-text>
        <g-manage-dns :key="componentKey" />
      </v-card-text>
    </template>
  </g-action-button-dialog>
</template>

<script>
import { ref } from 'vue'
import { useVuelidate } from '@vuelidate/core'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'
import GManageDns from '@/components/ShootDns/GManageDns'

import { useShootContext } from '@/composables/useShootContext'
import { useShootItem } from '@/composables/useShootItem'

import { errorDetailsFromError } from '@/utils/error'
import { v4 as uuidv4 } from '@/utils/uuid'

export default {
  components: {
    GActionButtonDialog,
    GManageDns,
  },
  inject: ['api', 'logger'],
  setup () {
    const {
      shootItem,
      shootNamespace,
      shootName,
    } = useShootItem()

    const {
      shootManifest,
      setShootManifest,
      forceMigrateSyncDnsProvidersToFalse,
    } = useShootContext()

    const componentKey = ref(uuidv4())

    return {
      v$: useVuelidate(),
      shootItem,
      shootNamespace,
      shootName,
      shootManifest,
      setShootManifest,
      componentKey,
      forceMigrateSyncDnsProvidersToFalse,
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
      this.componentKey = uuidv4() // force re-render
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.updateConfiguration()
      }
    },
    async updateConfiguration () {
      try {
        // Remove migration logic when all dns configurations have been migrated
        // and migraton logic has been removed from the extension
        this.forceMigrateSyncDnsProvidersToFalse()

        const { dns, extensions = null, resources = null } = this.shootManifest.spec

        await this.api.updateShootDns({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: {
            spec: {
              dns,
              extensions,
              resources,
            },
          },
        })
      } catch (err) {
        const errorMessage = 'Could not update DNS Configuration'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
  },
}
</script>
