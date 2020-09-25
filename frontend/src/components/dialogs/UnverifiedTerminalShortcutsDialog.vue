<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-dialog
    confirmButtonText="Confirm"
    max-width="750px"
    max-height="100vh"
    defaultColor="cyan-darken-2"
    ref="gDialog"
    >
    <template v-slot:caption>Confirm</template>
    <template v-slot:message>
      <div key="confirm-message" style="min-height:100px">
        <div>
          You selected
          <v-chip
            small
            class="my-0"
            outlined
            color="orange darken-2">
            Unverified
          </v-chip>
          terminal shortcuts that were created by members of this project and therefore could be malicious.
        </div>
        <div class="pt-2">
          Please confirm that you run only trusted terminal shortcuts.
        </div>
      </div>
    </template>
  </g-dialog>
</template>

<script>
import GDialog from '@/components/dialogs/GDialog'

export default {
  name: 'UnverifiedTerminalShortcutsDialog',
  components: {
    GDialog
  },
  methods: {
    async promptForConfirmation () {
      return await this.$refs.gDialog.confirmWithDialog()
    }
  }
}
</script>
