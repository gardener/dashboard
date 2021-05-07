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
    @dialog-opened="onConfigurationDialogOpened"
    >
    <template v-slot:actionComponent>
      <manage-shoot-dns :key="componentKey"></manage-shoot-dns>
    </template>
  </action-button-dialog>
</template>

<script>
import ActionButtonDialog from '@/components/dialogs/ActionButtonDialog'
import ManageShootDns from '@/components/ShootDns/ManageDns'
import { shootItem } from '@/mixins/shootItem'
import { mapMutations } from 'vuex'
import { v4 as uuidv4 } from '@/utils/uuid'

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
  data () {
    return {
      componentKey: uuidv4()
    }
  },
  mixins: [shootItem],
  methods: {
    ...mapMutations('componentStates', ['SET_MANAGE_DNS']),
    async onConfigurationDialogOpened () {
      this.reset()
      // const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      // if (confirmed) {
      //   this.updateConfiguration()
      // }
    },
    async updateConfiguration () {
      // try {
      //   const addons = this.$refs.addons.getAddons()
      //   await updateShootAddons({ namespace: this.shootNamespace, name: this.shootName, data: addons })
      // } catch (err) {
      //   const errorMessage = 'Could not update addons'
      //   const errorDetails = errorDetailsFromError(err)
      //   const detailedErrorMessage = errorDetails.detailedMessage
      //   this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
      //   console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      // }
    },
    reset () {
      this.SET_MANAGE_DNS(this.shootSpec.dns)
      this.componentKey = uuidv4() // force re-render
    }
  }
}
</script>
