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
    confirmButtonText="Change"
    :confirm-disabled="!validSettings"
    max-width="750px"
    max-height="100vh"
    defaultColor="cyan-darken-2"
    ref="gDialog"
    >
    <template v-slot:caption>Change Terminal Settings</template>
    <template v-slot:message>
      <terminal-settings
        ref="settings"
        :target="target"
        @selectedConfig="selectedConfigChanged"
        @validSettings="validSettingsChanged"
      ></terminal-settings>
    </template>
  </g-dialog>
</template>

<script>
import GDialog from '@/components/dialogs/GDialog'
import TerminalSettings from '@/components/TerminalSettings'

export default {
  components: {
    GDialog,
    TerminalSettings
  },
  props: {
    target: {
      type: String
    }
  },
  data () {
    return {
      selectedConfig: undefined,
      validSettings: false
    }
  },
  methods: {
    promptForConfigurationChange (initialState) {
      const confirmWithDialogPromise = this.$refs.gDialog.confirmWithDialog()
      return new Promise(resolve => {
        this.$nextTick(async () => {
          // delay execution to make sure that all components (especially $refs.settings) are loaded (slot in g-dialog/v-dialog is lazy)
          this.initialize(initialState)
          const confirmed = await confirmWithDialogPromise
          if (confirmed) {
            resolve(this.selectedConfig)
          } else {
            resolve(undefined)
          }
        })
      })
    },
    initialize (initialState) {
      this.$refs.settings.initialize(initialState)
    },
    selectedConfigChanged (selectedConfig) {
      this.selectedConfig = selectedConfig
    },
    validSettingsChanged (validSettings) {
      this.validSettings = validSettings
    }
  }
}
</script>
