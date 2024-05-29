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
    <template #content>
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
  ref,
  toRaw,
  watch,
} from 'vue'
import { useVuelidate } from '@vuelidate/core'

import GDialog from '@/components/dialogs/GDialog.vue'
import GTerminalSettings from '@/components/GTerminalSettings.vue'

import { useProvideTerminalConfig } from '@/composables/useTerminalConfig'

export default {
  components: {
    GDialog,
    GTerminalSettings,
  },
  props: {
    runtimeSettingsHidden: {
      type: Boolean,
      default: false,
    },
  },
  setup (props) {
    const {
      config,
      updateState,
    } = useProvideTerminalConfig()

    const selectedConfig = ref(null)

    watch(config, value => {
      selectedConfig.value = toRaw(value)
    })

    return {
      v$: useVuelidate(),
      config,
      updateState,
      selectedConfig,
    }
  },
  methods: {
    async promptForConfigurationChange (initialState) {
      this.updateState(initialState)
      const confirmed = await this.$refs.gDialog.confirmWithDialog()
      if (confirmed) {
        return this.config
      }
    },
  },
}
</script>
