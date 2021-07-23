<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <action-button-dialog
    :shoot-item="shootItem"
    ref="actionDialog"
    caption="Configure DNS"
    width="1000"
    confirmRequired
    @dialog-opened="onConfigurationDialogOpened"
    >
    <template v-slot:actionComponent>
      <manage-shoot-dns :key="componentKey"></manage-shoot-dns>
    </template>
  </action-button-dialog>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
import ActionButtonDialog from '@/components/dialogs/ActionButtonDialog'
import ManageShootDns from '@/components/ShootDns/ManageDns'
import { updateShootDns } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import { shootItem } from '@/mixins/shootItem'
import { v4 as uuidv4 } from '@/utils/uuid'

export default {
  name: 'dns-configuration',
  mixins: [shootItem],
  components: {
    ActionButtonDialog,
    ManageShootDns
  },
  data () {
    return {
      componentKey: uuidv4()
    }
  },
  computed: {
    ...mapGetters('shootStaging', [
      'getDnsConfiguration'
    ])
  },
  methods: {
    ...mapActions('shootStaging', [
      'setDnsConfiguration'
    ]),
    async onConfigurationDialogOpened () {
      this.reset()
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.updateConfiguration()
      }
    },
    async updateConfiguration () {
      try {
        const namespace = this.shootNamespace
        const name = this.shootName
        const data = this.getDnsConfiguration()
        await updateShootDns({ namespace, name, data })
      } catch (err) {
        const errorMessage = 'Could not update DNS Configuration'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    reset () {
      this.setDnsConfiguration(this.shootSpec.dns)
      this.componentKey = uuidv4() // force re-render
    }
  }
}
</script>
