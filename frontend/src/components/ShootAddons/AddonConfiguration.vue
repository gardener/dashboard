<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <action-button-dialog
    :shootItem="shootItem"
    @dialogOpened="onConfigurationDialogOpened"
    ref="actionDialog"
    caption="Configure Add-ons"
    maxWidth="900"
    max-height="60vh"
    >
    <template v-slot:actionComponent>
      <manage-shoot-addons
        ref="addons"
        :isCreateMode="false"
       ></manage-shoot-addons>
    </template>
  </action-button-dialog>
</template>

<script>
import ActionButtonDialog from '@/components/dialogs/ActionButtonDialog'
import ManageShootAddons from '@/components/ShootAddons/ManageAddons'
import { updateShootAddons } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import { shootItem } from '@/mixins/shootItem'
import get from 'lodash/get'
import cloneDeep from 'lodash/cloneDeep'

export default {
  name: 'addon-configuration',
  components: {
    ActionButtonDialog,
    ManageShootAddons
  },
  props: {
    shootItem: {
      type: Object
    }
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
    }
  }
}
</script>
