<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    :shoot-item="shootItem"
    width="450"
    caption="Configure Seed"
    confirm-required
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #actionComponent>
      <v-select
        v-model="seedName"
        hint="Change seed cluster for this shoot's control plane"
        color="primary"
        item-color="primary"
        label="Seed Cluster"
        :items="seedNames"
        persistent-hint
      />
    </template>
  </g-action-button-dialog>
</template>

<script>
import { mapState } from 'pinia'

import { useSeedStore } from '@/store/seed'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'

import { errorDetailsFromError } from '@/utils/error'
import shootItem from '@/mixins/shootItem'

import {
  map,
  filter,
} from '@/lodash'

export default {
  name: 'SeedConfiguration',
  components: {
    GActionButtonDialog,
  },
  mixins: [
    shootItem,
  ],
  inject: ['api', 'logger'],
  data () {
    return {
      seedName: undefined,
    }
  },
  computed: {
    ...mapState(useSeedStore, [
      'seedByName',
      'seedList',
    ]),
    seedNames () {
      const filteredSeeds = filter(this.seedList, ['data.type', this.shootCloudProviderKind])
      return map(filteredSeeds, seed => {
        return seed.metadata.name
      })
    },
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
    async reset () {
      this.seedName = this.shootSeedName
    },
  },
}
</script>
