<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-dialog
    confirm-button-text="Confirm"
    width="750"
    max-height="100vh"
    ref="gDialog"
    >
    <template #caption>Confirm</template>
    <template #message>
      <div key="confirm-message" style="min-height:100px">
        <div>
          You selected
          <v-chip
            small
            class="my-0"
            variant="outlined"
            color="warning">
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
import { defineComponent } from 'vue'
import GDialog from '@/components/dialogs/GDialog.vue'

export default defineComponent({
  name: 'UnverifiedTerminalShortcutsDialog',
  components: {
    GDialog,
  },
  methods: {
    async promptForConfirmation () {
      return await this.$refs.gDialog.confirmWithDialog()
    },
  },
})
</script>
