<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-dialog
    ref="gDialog"
    confirm-button-text="Change"
    width="750"
    max-height="100vh"
  >
    <template #caption>
      Change Terminal Settings
    </template>
    <template #scrollable-content>
      <v-card-text>
        <g-terminal-settings
          :runtime-settings-hidden="runtimeSettingsHidden"
        />
      </v-card-text>
    </template>
  </g-dialog>
</template>

<script>
import {
  toRefs,
  toRaw,
} from 'vue'
import { useVuelidate } from '@vuelidate/core'

import GDialog from '@/components/dialogs/GDialog.vue'
import GTerminalSettings from '@/components/GTerminalSettings.vue'

import { useTerminalConfig } from '@/composables/useTerminalConfig'

export default {
  components: {
    GDialog,
    GTerminalSettings,
  },
  provide () {
    return {
      ...toRefs(this.state),
    }
  },
  props: {
    runtimeSettingsHidden: {
      type: Boolean,
      default: false,
    },
  },
  setup () {
    return {
      v$: useVuelidate(),
      ...useTerminalConfig(),
    }
  },
  data () {
    return {
      selectedConfig: undefined,
    }
  },
  watch: {
    config (value) {
      this.selectedConfig = toRaw(value)
    },
  },
  methods: {
    async promptForConfigurationChange (initialState) {
      this.updateState(initialState)
      const confirmWithDialogPromise = this.$refs.gDialog.confirmWithDialog()
      const confirmed = await confirmWithDialogPromise
      if (confirmed) {
        return this.config
      }
    },
  },
}
</script>
