<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-dialog
    ref="gDialog"
    confirm-button-text="Create"
    :valid="valid"
    width="750"
    max-height="100vh"
  >
    <template #caption>
      Create Terminal Session
    </template>
    <template #content>
      <v-tabs
        v-model="tab"
        color="primary"
      >
        <v-tab
          value="target-tab"
          href="#target-tab"
        >
          Terminal
        </v-tab>
        <v-tab
          v-if="isTerminalShortcutsFeatureEnabled"
          value="shortcut-tab"
          href="#shortcut-tab"
        >
          Terminal Shortcuts
        </v-tab>
      </v-tabs>
      <v-window v-model="tab">
        <v-window-item value="target-tab">
          <g-terminal-target
            v-model="targetTab.selectedTarget"
            :loading="targetTab.configLoading"
          />
          <v-expansion-panels
            v-model="targetTab.value"
            class="pt-4"
            focusable
            :disabled="!isAdmin && isShootStatusHibernated"
          >
            <v-expansion-panel title="Terminal Configuration">
              <v-expansion-panel-text>
                <v-skeleton-loader
                  v-show="targetTab.configLoading"
                  height="94"
                  type="list-item-two-line"
                />
                <g-terminal-settings
                  v-show="!targetTab.configLoading"
                  ref="settings"
                  :runtime-settings-hidden="!hasShootWorkerGroups || targetTab.selectedTarget !== TargetEnum.SHOOT"
                />
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-window-item>
        <!-- popper-boundaries-selector="#shortcut-tab" -->
        <v-window-item value="shortcut-tab">
          <v-item-group
            multiple
            color="primary"
            selected-class="bg-secondary"
            :model-value="shortcutTab.selectedShortcuts"
            @update:model-value="shortcutTab.selectedShortcuts = $event"
          >
            <g-list>
              <g-terminal-shortcuts
                popper-boundaries-selector="#shortcut-tab"
                @add-terminal-shortcut="onAddTerminalShortcut"
              />
            </g-list>
          </v-item-group>
        </v-window-item>
      </v-window>
      <g-unverified-terminal-shortcuts-dialog
        ref="unverified"
      />
      <g-webterminal-service-account-dialog
        ref="serviceAccount"
        :namespace="shootNamespace"
      />
    </template>
    <template #footer>
      <div v-if="targetTab.selectedTarget">
        <v-alert
          v-if="isUserGardenTerminal"
          class="ma-2"
          type="info"
          color="primary"
          variant="tonal"
        >
          <strong>Terminal will be running on <span class="font-family-monospace">{{ shootName }}</span> cluster</strong><br>
          Make sure that only gardener project members with <span class="font-family-monospace">admin</span> role have privileged access to the <span class="font-family-monospace">{{ shootName }}</span> cluster before creating this terminal session.
        </v-alert>
        <v-alert
          v-if="isAdmin && isTerminalInUntrustedEnvironment"
          class="ma-2"
          type="info"
          color="primary"
          variant="tonal"
        >
          <strong>Terminal will be running in an untrusted environment!</strong><br>
          Do not enter credentials or sensitive data within the terminal session that cluster owners should not have access to, as the terminal will be running on one of the worker nodes.
        </v-alert>
        <v-alert
          v-if="hasNoAvailableNodes"
          class="ma-2"
          type="error"
          variant="tonal"
        >
          <strong>Cannot schedule terminal on <span class="font-family-monospace">{{ shootName }}</span> cluster</strong><br>
          No worker nodes available in the cluster. Please check the cluster status and try again.
        </v-alert>
      </div>
    </template>
  </g-dialog>
</template>

<script>
import { toRaw } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { mapState } from 'pinia'

import { useAuthnStore } from '@/store/authn'
import { useTerminalStore } from '@/store/terminal'

import GDialog from '@/components/dialogs/GDialog.vue'
import GTerminalSettings from '@/components/GTerminalSettings.vue'
import GTerminalTarget from '@/components/GTerminalTarget.vue'
import GTerminalShortcuts from '@/components/GTerminalShortcuts.vue'
import GUnverifiedTerminalShortcutsDialog from '@/components/dialogs/GUnverifiedTerminalShortcutsDialog.vue'
import GWebterminalServiceAccountDialog from '@/components/dialogs/GWebterminalServiceAccountDialog.vue'

import { useProvideTerminalConfig } from '@/composables/useTerminalConfig'
import { useTerminalSplitpanes } from '@/composables/useTerminalSplitpanes'

import { TargetEnum } from '@/utils'

import some from 'lodash/some'
import find from 'lodash/find'
import pick from 'lodash/pick'
import isEmpty from 'lodash/isEmpty'
import includes from 'lodash/includes'
import get from 'lodash/get'
import filter from 'lodash/filter'

export default {
  components: {
    GDialog,
    GTerminalSettings,
    GTerminalTarget,
    GTerminalShortcuts,
    GUnverifiedTerminalShortcutsDialog,
    GWebterminalServiceAccountDialog,
  },
  inject: ['api'],
  setup () {
    const {
      shootNamespace,
      shootName,
      hasShootWorkerGroups,
      isShootStatusHibernated,
      canScheduleOnSeed,
      newTerminalPrompt,
      defaultTarget,
      setSelections,
    } = useTerminalSplitpanes()

    const {
      config,
      state,
      updateState,
    } = useProvideTerminalConfig()

    return {
      v$: useVuelidate(),
      shootNamespace,
      shootName,
      hasShootWorkerGroups,
      isShootStatusHibernated,
      canScheduleOnSeed,
      newTerminalPrompt,
      defaultTarget,
      setSelections,
      config,
      state,
      updateState,
      TargetEnum,
    }
  },
  data () {
    return {
      tab: undefined,
      targetTab: {
        selectedTarget: undefined,
        value: [],
        initializedForTarget: undefined,
        selectedConfig: undefined,
        configLoading: false,
      },
      shortcutTab: {
        selectedShortcuts: undefined,
      },
    }
  },
  computed: {
    ...mapState(useAuthnStore, [
      'isAdmin',
    ]),
    ...mapState(useTerminalStore, [
      'isTerminalShortcutsFeatureEnabled',
    ]),
    valid () {
      switch (this.tab) {
        case 'shortcut-tab': {
          return !isEmpty(this.shortcutTab.selectedShortcuts)
        }
        default: {
          if (this.targetTab.configLoading) {
            return false
          }

          if (this.hasNoAvailableNodes) {
            return false
          }
          return !this.v$.$invalid
        }
      }
    },
    selections () {
      switch (this.tab) {
        case 'target-tab': {
          const {
            container,
            node,
            hostPID,
            hostNetwork,
            preferredHost,
          } = pick(this.targetTab.selectedConfig, ['container', 'node', 'hostPID', 'hostNetwork', 'preferredHost'])

          return [{
            target: this.targetTab.selectedTarget,
            container,
            node,
            hostPID,
            hostNetwork,
            preferredHost,
          }]
        }
        case 'shortcut-tab': {
          return this.shortcutTab.selectedShortcuts
        }
        default: {
          return undefined
        }
      }
    },
    isUserGardenTerminal () {
      return !this.isAdmin && this.targetTab.selectedTarget === TargetEnum.GARDEN
    },
    isTerminalInUntrustedEnvironment () {
      return this.targetTab.selectedTarget === TargetEnum.SHOOT &&
          !this.targetTab.configLoading &&
          this.state.runtime === TargetEnum.SHOOT
    },
    hasNoAvailableNodes () {
      if (this.state.runtime !== TargetEnum.SHOOT) {
        return false
      }
      if (this.isAdmin && this.targetTab.selectedTarget === TargetEnum.GARDEN) {
        // Admin Garden Terminal always scheduled on dedicated managed seed
        return false
      }

      return !this.targetTab.configLoading && !this.state.shootNodes.length
    },
  },
  watch: {
    config (value) {
      this.targetTab.selectedConfig = toRaw(value)
    },
    async newTerminalPrompt (value) {
      if (value) {
        await this.promptForSelections()
      }
    },
    defaultTarget (value) {
      this.targetTab.selectedTarget = value
    },
    'targetTab.selectedTarget' () {
      this.updateSettings()
    },
  },
  methods: {
    async promptForSelections () {
      this.initialize()
      const confirmed = await this.$refs.gDialog.confirmWithDialog(
        async () => {
          const unverifiedSelections = filter(this.shortcutTab.selectedShortcuts, ['unverified', true])
          if (!isEmpty(unverifiedSelections)) {
            const confirmed = await this.$refs.unverified.promptForConfirmation()
            if (!confirmed) {
              return false
            }
          }
          const selectionContainsGardenTarget = some(this.selections, ['target', TargetEnum.GARDEN])
          if (this.isAdmin || !selectionContainsGardenTarget) {
            return true
          }

          const { data: projectMembers } = await this.api.getMembers({
            namespace: this.shootNamespace,
          })
          const serviceAccountName = `system:serviceaccount:${this.shootNamespace}:dashboard-webterminal`
          const member = find(projectMembers, ['username', serviceAccountName])
          const roles = get(member, ['roles'])
          if (includes(roles, 'admin') && includes(roles, 'serviceaccountmanager')) {
            return true
          }

          return this.$refs.serviceAccount.promptForConfirmation(member)
        },
      )
      if (!confirmed) {
        return this.setSelections(undefined)
      }
      return this.setSelections(this.selections)
    },
    initialize () {
      this.reset()

      this.targetTab.selectedTarget = this.defaultTarget
      this.targetTab.selectedConfig = {
        container: undefined,
      }
      this.updateSettings()
    },
    reset () {
      this.tab = 'target-tab'
      this.targetTab = {
        selectedTarget: undefined,
        value: [],
        initializedForTarget: undefined,
        selectedConfig: undefined,
      }
      this.shortcutTab = {
        selectedShortcuts: [],
      }
    },
    async updateSettings () {
      if (this.targetTab.initializedForTarget === this.targetTab.selectedTarget) {
        // no need to update
        return
      }

      this.targetTab.configLoading = true
      try {
        this.targetTab.initializedForTarget = this.targetTab.selectedTarget
        const { data: config } = await this.api.terminalConfig({
          namespace: this.shootNamespace,
          name: this.shootName,
          target: this.targetTab.selectedTarget,
        })
        config.canScheduleOnSeed = this.canScheduleOnSeed

        this.updateState(config)
      } catch (err) {
        this.targetTab.initializedForTarget = undefined
      }

      this.targetTab.configLoading = false
    },
    onAddTerminalShortcut (shortcut) {
      this.shortcutTab.selectedShortcuts = [shortcut]
      // need to defer execution as at this time.
      // Otherwise, when clicking on the "run terminal shortcut" button, it is not yet valid and an old cached value is taken.
      // This is bad and we already discussed that we need to re-design the GDialog component.
      this.$nextTick(() => {
        this.$refs.gDialog.resolveAction(true)
      })
    },
  },
}
</script>
