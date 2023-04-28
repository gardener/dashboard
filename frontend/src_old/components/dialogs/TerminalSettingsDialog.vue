<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-dialog
    confirm-button-text="Change"
    :confirm-disabled="!validSettings"
    width="750"
    max-height="100vh"
    ref="gDialog"
    >
    <template v-slot:caption>Change Terminal Settings</template>
    <template v-slot:message>
      <terminal-settings
        ref="settings"
        :target="target"
        @selected-config="selectedConfigChanged"
        @valid-settings="validSettingsChanged"
      ></terminal-settings>
    </template>
  </g-dialog>
</template>

<script>
import GDialog from '@/components/dialogs/GDialog.vue'
import TerminalSettings from '@/components/TerminalSettings.vue'

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
