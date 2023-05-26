<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    :shoot-item="shootItem"
    @dialog-opened="onConfigurationDialogOpened"
    ref="actionDialog"
    caption="Configure Add-ons"
    width="900"
    max-height="60vh"
    >
    <template #actionComponent>
      <g-manage-shoot-addons
        ref="addons"
       ></g-manage-shoot-addons>
    </template>
  </g-action-button-dialog>
</template>

<script>
import { defineComponent } from 'vue'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'
import GManageShootAddons from '@/components/ShootAddons/GManageAddons'
import { updateShootAddons } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import { shootItem } from '@/mixins/shootItem'
import get from 'lodash/get'
import cloneDeep from 'lodash/cloneDeep'

export default defineComponent({
  components: {
    GActionButtonDialog,
    GManageShootAddons,
  },
  mixins: [shootItem],
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
        await updateShootAddons({ namespace: this.shootNamespace, name: this.shootName, data: addons })
      } catch (err) {
        const errorMessage = 'Could not update addons'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    reset () {
      const addons = cloneDeep(get(this.shootItem, 'spec.addons', {}))
      this.$refs.addons.updateAddons(addons)
    },
  },
})
</script>
