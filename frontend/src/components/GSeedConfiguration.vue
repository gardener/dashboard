<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    width="450"
    caption="Configure Seed"
    confirm-required
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <v-card-text>
        <v-select
          v-model="seedName"
          hint="Change seed cluster for this shoot's control plane"
          color="primary"
          item-color="primary"
          label="Seed Cluster"
          :items="seedNames"
          persistent-hint
        />
        <div
          v-if="providerMismatch"
          class="my-2"
        >
          Note: Ensure network connectivity for etcd backups and Shoot control plane. Without it, migration may stall.
        </div>
      </v-card-text>
    </template>
  </g-action-button-dialog>
</template>

<script>
import {
  ref,
  computed,
} from 'vue'

import { useSeedStore } from '@/store/seed'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'

import { useShootItem } from '@/composables/useShootItem'

import { errorDetailsFromError } from '@/utils/error'

import map from 'lodash/map'
import find from 'lodash/find'

export default {
  components: {
    GActionButtonDialog,
  },
  inject: ['api', 'logger'],
  setup () {
    const {
      shootNamespace,
      shootName,
      shootSeedName,
      shootProviderType,
    } = useShootItem()

    const seedStore = useSeedStore()

    const seedNames = computed(() => {
      return map(seedStore.seedList, 'metadata.name')
    })

    const providerMismatch = computed(() => {
      const selectedSeed = find(seedStore.seedList, ['metadata.name', seedName.value])
      const sourceSeed = find(seedStore.seedList, ['metadata.name', shootSeedName.value])
      if (!selectedSeed || !sourceSeed) {
        return false
      }
      const selectedProvider = selectedSeed.data.type
      const sourceProvider = sourceSeed.data.type
      const shootProvider = shootProviderType.value
      return selectedProvider !== sourceProvider || selectedProvider !== shootProvider
    })

    const seedName = ref(shootSeedName.value)

    return {
      shootNamespace,
      shootName,
      shootSeedName,
      seedName,
      seedNames,
      providerMismatch,
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
      this.seedName = this.shootSeedName
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        await this.updateConfiguration()
      }
    },
    async updateConfiguration () {
      try {
        await this.api.updateShootSeedName({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: {
            seedName: this.seedName,
          },
        })
      } catch (err) {
        const errorMessage = 'Could not update seedName'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
  },
}
</script>
