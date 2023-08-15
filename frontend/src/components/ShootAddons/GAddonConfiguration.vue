<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    :shoot-item="shootItem"
    caption="Configure Add-ons"
    width="900"
    max-height="60vh"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #actionComponent>
      <g-manage-shoot-addons
        ref="addons"
      />
    </template>
  </g-action-button-dialog>
</template>

<script>
import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'
import GManageShootAddons from '@/components/ShootAddons/GManageAddons'

import { errorDetailsFromError } from '@/utils/error'
import { shootItem } from '@/mixins/shootItem'

import {
  get,
  cloneDeep,
} from '@/lodash'

export default {
  components: {
    GActionButtonDialog,
    GManageShootAddons,
  },
  mixins: [shootItem],
  inject: ['api', 'logger'],
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
        const addons = this.$refs.addons.getAddons()
        await this.api.updateShootAddons({ namespace: this.shootNamespace, name: this.shootName, data: addons })
      } catch (err) {
        const errorMessage = 'Could not update addons'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    reset () {
      const addons = cloneDeep(get(this.shootItem, 'spec.addons', {}))
      this.$refs.addons.updateAddons(addons)
    },
  },
}
</script>
@/lodash
