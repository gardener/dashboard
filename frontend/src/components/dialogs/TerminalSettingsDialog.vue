<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
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
