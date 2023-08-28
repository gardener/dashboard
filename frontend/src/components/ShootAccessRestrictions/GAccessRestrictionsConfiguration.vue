<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    :shoot-item="shootItem"
    :disabled="disabled"
    :tooltip="tooltip"
    width="900"
    caption="Configure Access Restrictions"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #actionComponent>
      <g-access-restrictions
        ref="accessRestrictions"
      />
    </template>
  </g-action-button-dialog>
</template>

<script>
import { mapState } from 'pinia'

import { useCloudProfileStore } from '@/store/cloudProfile'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'
import GAccessRestrictions from '@/components/ShootAccessRestrictions/GAccessRestrictions'

import { shootItem } from '@/mixins/shootItem'
import { errorDetailsFromError } from '@/utils/error'

import {
  isEmpty,
  cloneDeep,
} from '@/lodash'

export default {
  name: 'AccessRestrictionConfiguration',
  components: {
    GActionButtonDialog,
    GAccessRestrictions,
  },
  mixins: [shootItem],
  inject: ['api', 'logger'],
  computed: {
    ...mapState(useCloudProfileStore, [
      'accessRestrictionNoItemsTextForCloudProfileNameAndRegion',
      'accessRestrictionDefinitionsByCloudProfileNameAndRegion',
    ]),
    disabled () {
      const accessRestrictionDefinitions = this.accessRestrictionDefinitionsByCloudProfileNameAndRegion({ cloudProfileName: this.shootCloudProfileName, region: this.shootRegion })
      return isEmpty(accessRestrictionDefinitions)
    },
    noItemsText () {
      return this.accessRestrictionNoItemsTextForCloudProfileNameAndRegion({ cloudProfileName: this.shootCloudProfileName, region: this.shootRegion })
    },
    tooltip () {
      if (!this.disabled) {
        return undefined
      }
      return this.noItemsText
    },
  },
  methods: {
    async onConfigurationDialogOpened () {
      this.reset()
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.updateConfiguration()
      }
    },
    async updateConfiguration () {
      try {
        const shootResource = cloneDeep(this.shootItem)
        this.$refs.accessRestrictions.applyTo(shootResource)
        await this.api.replaceShoot({ namespace: this.shootNamespace, name: this.shootName, data: shootResource })
      } catch (err) {
        const errorMessage = 'Could not save access restriction configuration'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    reset () {
      this.$refs.accessRestrictions.setAccessRestrictions({ shootResource: this.shootItem, cloudProfileName: this.shootCloudProfileName, region: this.shootRegion })
    },
  },
}
</script>
