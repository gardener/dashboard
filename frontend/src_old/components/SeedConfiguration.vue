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
    caption="Configure Seed"
    confirm-required>
    <template v-slot:actionComponent>
      <v-select
        hint="Change seed cluster for this shoot's control plane"
        color="primary"
        item-color="primary"
        label="Seed Cluster"
        :items="seedNames"
        v-model="seedName"
        persistent-hint>
      </v-select>
    </template>
  </action-button-dialog>
</template>

<script>
import map from 'lodash/map'
import filter from 'lodash/filter'

import { mapGetters } from 'vuex'

import ActionButtonDialog from '@/components/dialogs/ActionButtonDialog.vue'

import { updateShootSeedName } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'

import shootItem from '@/mixins/shootItem'

export default {
  name: 'seed-configuration',
  components: {
    ActionButtonDialog
  },
  mixins: [
    shootItem
  ],
  data () {
    return {
      seedName: undefined
    }
  },
  computed: {
    ...mapGetters([
      'seedList'
    ]),
    seedNames () {
      const filteredSeeds = filter(this.seedList, ['data.type', this.shootCloudProviderKind])
      return map(filteredSeeds, seed => {
        return seed.metadata.name
      })
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
        await updateShootSeedName({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: {
            seedName: this.seedName
          }
        })
      } catch (err) {
        const errorMessage = 'Could not update seedName'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    async reset () {
      this.seedName = this.shootSeedName
    }
  }
}
</script>
