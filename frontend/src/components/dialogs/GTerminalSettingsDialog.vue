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
        :runtime-settings-hidden="!hasShootWorkerGroups || target !== 'shoot'"
      />
    </template>
  </g-dialog>
</template>

<script>
import {
  toRefs,
  toRaw,
} from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { mapActions } from 'pinia'

import { useShootStore } from '@/store/shoot'

import GDialog from '@/components/dialogs/GDialog.vue'
import GTerminalSettings from '@/components/GTerminalSettings.vue'

import { useTerminalConfig } from '@/composables/useTerminalConfig'

import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    GDialog,
    GTerminalSettings,
  },
  mixins: [shootItem],
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
    ...mapActions(useShootStore, ['shootByNamespaceAndName']),
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
