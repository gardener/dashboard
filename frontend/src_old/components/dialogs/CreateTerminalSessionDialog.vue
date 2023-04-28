<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-dialog
    confirm-button-text="Create"
    :confirm-disabled="!valid"
    width="750"
    max-height="100vh"
    ref="gDialog"
  >
    <template v-slot:caption>Create Terminal Session</template>
    <template v-slot:message>
      <v-tabs v-model="tab" color="primary">
        <v-tab key="target-tab" href="#target-tab">Terminal</v-tab>
        <v-tab v-if="isTerminalShortcutsFeatureEnabled" key="shortcut-tab" href="#shortcut-tab">Terminal Shortcuts</v-tab>
      </v-tabs>
      <v-tabs-items v-model="tab">
        <v-tab-item key="target-tab" value="target-tab">
          <terminal-target
            v-model="targetTab.selectedTarget"
            :shoot-item="shootItem"
            @valid="onTerminalTargetValid"
            @input="updateSettings"
          ></terminal-target>
          <v-expansion-panels class="pt-4" focusable v-model="targetTab.value" :disabled="!isAdmin && isShootStatusHibernated">
            <v-expansion-panel>
              <v-expansion-panel-header>Terminal Configuration</v-expansion-panel-header>
              <v-expansion-panel-content>
                <v-skeleton-loader
                  v-show="!targetTab.selectedConfig"
                  height="94"
                  type="list-item-two-line"
                ></v-skeleton-loader>
                <terminal-settings
                  v-show="!!targetTab.selectedConfig"
                  ref="settings"
                  :target="targetTab.selectedTarget"
                  @selected-config="selectedConfigChanged"
                  @valid-settings="validSettingsChanged"
                ></terminal-settings>
              </v-expansion-panel-content>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-tab-item>
        <!-- popper-boundaries-selector="#shortcut-tab" -->
        <v-tab-item key="shortcut-tab" value="shortcut-tab">
          <v-list>
            <v-list-item-group
              v-model="shortcutTab.selectedShortcuts"
              color="primary"
              active-class="g-border"
              multiple
            >
              <terminal-shortcuts
                :shoot-item="shootItem"
                popper-boundaries-selector="#shortcut-tab"
                @add-terminal-shortcut="onAddTerminalShortcut"
              ></terminal-shortcuts>
            </v-list-item-group>
          </v-list>
        </v-tab-item>
      </v-tabs-items>
      <unverified-terminal-shortcuts-dialog
        ref="unverified"
      ></unverified-terminal-shortcuts-dialog>
      <webterminal-service-account-dialog
        :namespace="namespace"
        ref="serviceAccount"
      ></webterminal-service-account-dialog>
    </template>
  </g-dialog>
</template>

<script>
import GDialog from '@/components/dialogs/GDialog.vue'
import TerminalSettings from '@/components/TerminalSettings.vue'
import TerminalTarget from '@/components/TerminalTarget.vue'
import TerminalShortcuts from '@/components/TerminalShortcuts.vue'
import UnverifiedTerminalShortcutsDialog from '@/components/dialogs/UnverifiedTerminalShortcutsDialog.vue'
import WebterminalServiceAccountDialog from '@/components/dialogs/WebterminalServiceAccountDialog.vue'
import { mapGetters } from 'vuex'
import { getMembers, terminalConfig } from '@/utils/api'
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
    TerminalSettings,
    TerminalTarget,
    TerminalShortcuts,
    UnverifiedTerminalShortcutsDialog,
    WebterminalServiceAccountDialog
  },
  props: {
    name: {
      type: String
    },
    namespace: {
      type: String
    }
  },
  data () {
    return {
      tab: undefined,
      targetTab: {
        selectedTarget: undefined,
        terminalTargetValid: false,
        value: [],
        initializedForTarget: undefined,
        selectedConfig: undefined,
        validSettings: true // settings are assumed to be valid initially as the defaults apply. Once the settings expansion panel is expanded, this property get's updated
      },
      shortcutTab: {
        selectedShortcuts: undefined
      }
    }
  },
  computed: {
    ...mapGetters([
      'hasControlPlaneTerminalAccess',
      'hasShootTerminalAccess',
      'hasGardenTerminalAccess',
      'isAdmin',
      'shootByNamespaceAndName',
      'isTerminalShortcutsFeatureEnabled',
      'projectList'
    ]),
    shootItem () {
      return this.shootByNamespaceAndName(pick(this, 'namespace', 'name'))
    },
    isShootStatusHibernated () {
      return isShootStatusHibernated(get(this.shootItem, 'status'))
    },
    valid () {
      switch (this.tab) {
        case 'target-tab': {
          if (!this.targetTab.terminalTargetValid) {
            return false
          }

          return this.targetTab.validSettings
        }
        case 'shortcut-tab': {
          return !isEmpty(this.shortcutTab.selectedShortcuts)
        }
        default: {
          return false
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
            preferredHost
          } = pick(this.targetTab.selectedConfig, ['container', 'node', 'hostPID', 'hostNetwork', 'preferredHost'])

          return [{
            target: this.targetTab.selectedTarget,
            container,
            node,
            hostPID,
            hostNetwork,
            preferredHost
          }]
        }
        case 'shortcut-tab': {
          return this.shortcutTab.selectedShortcuts
        }
        default: {
          return undefined
        }
      }
    }
  },
  methods: {
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

          const { data: projectMembers } = await getMembers({ namespace: this.namespace })
          const serviceAccountName = `system:serviceaccount:${this.namespace}:dashboard-webterminal`
          const member = find(projectMembers, ['username', serviceAccountName])
          const roles = get(member, 'roles')
          if (includes(roles, 'admin') && includes(roles, 'serviceaccountmanager')) {
            return true
          }

          return this.$refs.serviceAccount.promptForConfirmation(member)
        }
      )
      if (!confirmed) {
        return undefined
      }
      return this.selections
    },
    initialize ({ target, container }) {
      this.reset()

      this.$nextTick(() => {
        this.targetTab.selectedTarget = target
        this.targetTab.selectedConfig = {
          container
        }
      })
    },
    reset () {
      this.tab = 'target-tab'
      this.targetTab = {
        selectedTarget: undefined,
        terminalTargetValid: false,
        value: [],
        initializedForTarget: undefined,
        selectedConfig: undefined,
        validSettings: true // settings are assumed to be valid initially as the defaults apply. Once the settings expansion panel is expanded, this property get's updated
      }
      this.shortcutTab = {
        selectedShortcuts: []
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
        const { data: config } = await terminalConfig({ name: this.name, namespace: this.namespace, target: this.targetTab.selectedTarget })
        this.$refs.settings.initialize(config)
      } catch (err) {
        this.targetTab.initializedForTarget = undefined
      }
    },
    selectedConfigChanged (selectedConfig) {
      this.targetTab.selectedConfig = selectedConfig
    },
    validSettingsChanged (validSettings) {
      this.targetTab.validSettings = validSettings
    },
    onAddTerminalShortcut (shortcut) {
      this.shortcutTab.selectedShortcuts = [shortcut]
      this.$refs.gDialog.resolveAction(true)
    },
    onTerminalTargetValid (valid) {
      this.targetTab.terminalTargetValid = valid
    }
  },
  watch: {
    isSettingsExpanded () {
      this.updateSettings()
    }
  }
}
</script>

// Non-scoped style for g-border class, which will be applied to the v-list-item in TerminalShortcut component. Alternatively we could define the g-border class only in the TerminalShortcut component.
<style>
  .g-border {
    border: 1px solid #0097a7;
  }
</style>
