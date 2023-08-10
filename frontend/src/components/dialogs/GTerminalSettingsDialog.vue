<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-dialog
    ref="gDialog"
    confirm-button-text="Change"
    :confirm-disabled="v$.$invalid"
    width="750"
    max-height="100vh"
  >
    <template #caption>
      Change Terminal Settings
    </template>
    <template #message>
      <g-terminal-settings
        :target="target"
      />
    </template>
  </g-dialog>
</template>

<script>
import { toRefs, toRaw } from 'vue'
import { useVuelidate } from '@vuelidate/core'

import { useTerminalConfig } from '@/composables'

import GDialog from '@/components/dialogs/GDialog.vue'
import GTerminalSettings from '@/components/GTerminalSettings.vue'

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
    target: {
      type: String,
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
