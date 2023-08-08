<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-dialog
    ref="gDialog"
    confirm-button-text="Create"
    :confirm-disabled="!valid"
    width="750"
    max-height="100vh"
  >
    <template #caption>
      Create Terminal Session
    </template>
    <template #message>
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
            :shoot-item="shootItem"
            @update:model-value="updateSettings"
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
                  v-show="!targetTab.selectedConfig"
                  height="94"
                  type="list-item-two-line"
                />
                <g-terminal-settings
                  v-show="!!targetTab.selectedConfig"
                  ref="settings"
                  :target="targetTab.selectedTarget"
                  @selected-config="selectedConfigChanged"
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
                :shoot-item="shootItem"
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
        :namespace="namespace"
      />
    </template>
  </g-dialog>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'

import { mapState, mapActions } from 'pinia'
import {
  useAuthnStore,
  useShootStore,
  useTerminalStore,
} from '@/store'
import GDialog from '@/components/dialogs/GDialog.vue'
import GTerminalSettings from '@/components/GTerminalSettings.vue'
import GTerminalTarget from '@/components/GTerminalTarget.vue'
import GTerminalShortcuts from '@/components/GTerminalShortcuts.vue'
import GUnverifiedTerminalShortcutsDialog from '@/components/dialogs/GUnverifiedTerminalShortcutsDialog.vue'
import GWebterminalServiceAccountDialog from '@/components/dialogs/GWebterminalServiceAccountDialog.vue'
import { TargetEnum, isShootStatusHibernated } from '@/utils'
import filter from 'lodash/filter'
import get from 'lodash/get'
import includes from 'lodash/includes'
import isEmpty from 'lodash/isEmpty'
import pick from 'lodash/pick'
import find from 'lodash/find'
import some from 'lodash/some'

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
  props: {
    name: {
      type: String,
    },
    namespace: {
      type: String,
    },
  },
  setup () {
    return {
      v$: useVuelidate(),
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
    shootItem () {
      return this.shootByNamespaceAndName(pick(this, 'namespace', 'name'))
    },
    isShootStatusHibernated () {
      return isShootStatusHibernated(get(this.shootItem, 'status'))
    },
    valid () {
      switch (this.tab) {
        case 'shortcut-tab': {
          return !isEmpty(this.shortcutTab.selectedShortcuts)
        }
        default: {
          return !this.v$.$invalid
        }
      }
    },
    isSettingsExpanded () {
      return this.targetTab.value === 0
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
  },
  watch: {
    isSettingsExpanded () {
      this.updateSettings()
    },
  },
  methods: {
    ...mapActions(useShootStore, ['shootByNamespaceAndName']),
    async promptForSelections (initialState) {
      this.initialize(initialState)
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

          const { data: projectMembers } = await this.api.getMembers({ namespace: this.namespace })
          const serviceAccountName = `system:serviceaccount:${this.namespace}:dashboard-webterminal`
          const member = find(projectMembers, ['username', serviceAccountName])
          const roles = get(member, 'roles')
          if (includes(roles, 'admin') && includes(roles, 'serviceaccountmanager')) {
            return true
          }

          return this.$refs.serviceAccount.promptForConfirmation(member)
        },
      )
      if (!confirmed) {
        return undefined
      }
      return this.selections
    },
    initialize ({ target, container }) {
      this.reset()

      this.targetTab.selectedTarget = target
      this.targetTab.selectedConfig = {
        container,
      }
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

      this.targetTab.selectedConfig = undefined
      try {
        this.targetTab.initializedForTarget = this.targetTab.selectedTarget
        const { data: config } = await this.api.terminalConfig({ name: this.name, namespace: this.namespace, target: this.targetTab.selectedTarget })
        this.$refs.settings.initialize(config)
      } catch (err) {
        this.targetTab.initializedForTarget = undefined
      }
    },
    selectedConfigChanged (selectedConfig) {
      this.targetTab.selectedConfig = selectedConfig
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
