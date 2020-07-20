<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
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
