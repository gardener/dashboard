<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <action-button-dialog
    :shoot-item="shootItem"
    ref="actionDialog"
    caption="Configure DNS"
    max-width="900"
    max-height="60vh"
    >
    <template v-slot:actionComponent>
      <manage-shoot-dns></manage-shoot-dns>
    </template>
  </action-button-dialog>
</template>

<script>
import ActionButtonDialog from '@/components/dialogs/ActionButtonDialog'
import ManageShootDns from '@/components/ShootDns/ManageDns'
import { shootItem } from '@/mixins/shootItem'

export default {
  name: 'dns-configuration',
  components: {
    ActionButtonDialog,
    ManageShootDns
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  mixins: [shootItem],
  methods: {
    // async onConfigurationDialogOpened () {
    //   this.reset()
    //   const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
    //   if (confirmed) {
    //     this.updateConfiguration()
    //   }
    // },
    // async updateConfiguration () {
    //   try {
    //     const addons = this.$refs.addons.getAddons()
    //     await updateShootAddons({ namespace: this.shootNamespace, name: this.shootName, data: addons })
    //   } catch (err) {
    //     const errorMessage = 'Could not update addons'
    //     const errorDetails = errorDetailsFromError(err)
    //     const detailedErrorMessage = errorDetails.detailedMessage
    //     this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
    //     console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
    //   }
    // },
    // reset () {
    //   const addons = cloneDeep(get(this.shootItem, 'spec.addons', {}))
    //   this.$refs.addons.updateAddons(addons)
    // }
  }
}
</script>
