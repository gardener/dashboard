<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-list-item>
      <v-list-item-icon>
        <icon-base width="24" height="23" icon-color="primary" view-box="-4 0 56 54">
          <terminal-shortcut-icon></terminal-shortcut-icon>
        </icon-base>
      </v-list-item-icon>
      <v-list-item-content>
        <v-list-item-title>Terminal Shortcuts</v-list-item-title>
        <v-list-item-subtitle>Launch preconfigured terminals for frequently used views</v-list-item-subtitle>
      </v-list-item-content>
      <v-list-item-action class="mx-0">
        <v-tooltip location="top">
          <template v-slot:activator="{ on }">
            <v-btn color="action-button" v-on="on" icon @click.stop="expansionPanel = !expansionPanel">
              <v-icon>{{expansionPanelIcon}}</v-icon>
            </v-btn>
          </template>
          <span>{{expansionPanelTooltip}}</span>
        </v-tooltip>
      </v-list-item-action>
    </v-list-item>
    <v-expand-transition appear>
      <v-card v-if="expansionPanel" flat class="ml-14 mt-2">
        <v-card-text class="pa-0">
          <terminal-shortcuts
            :shoot-item="shootItem"
            :popper-boundaries-selector="popperBoundariesSelector"
            @add-terminal-shortcut="onAddTerminalShortcut"
          ></terminal-shortcuts>
        </v-card-text>
      </v-card>
    </v-expand-transition>
    <unverified-terminal-shortcuts-dialog
      ref="unverified"
    ></unverified-terminal-shortcuts-dialog>
    <webterminal-service-account-dialog
      :namespace="shootNamespace"
      ref="serviceAccount"
    ></webterminal-service-account-dialog>
  </div>
</template>

<script>

import { mapGetters } from 'vuex'
import TerminalShortcuts from '@/components/TerminalShortcuts.vue'
import IconBase from '@/components/icons/IconBase.vue'
import TerminalShortcutIcon from '@/components/icons/TerminalShortcutIcon.vue'
import UnverifiedTerminalShortcutsDialog from '@/components/dialogs/UnverifiedTerminalShortcutsDialog.vue'
import WebterminalServiceAccountDialog from '@/components/dialogs/WebterminalServiceAccountDialog.vue'
import { TargetEnum } from '@/utils'
import { shootItem } from '@/mixins/shootItem'
import { getMembers } from '@/utils/api'
import get from 'lodash/get'
import find from 'lodash/find'
import includes from 'lodash/includes'

export default {
  mixins: [shootItem],
  props: {
    popperBoundariesSelector: {
      type: String
    }
  },
  data () {
    return {
      expansionPanel: false
    }
  },
  components: {
    TerminalShortcuts,
    IconBase,
    TerminalShortcutIcon,
    UnverifiedTerminalShortcutsDialog,
    WebterminalServiceAccountDialog
  },
  computed: {
    ...mapGetters([
      'isAdmin'
    ]),
    expansionPanelIcon () {
      return this.expansionPanel ? 'mdi-chevron-up' : 'mdi-chevron-down'
    },
    expansionPanelTooltip () {
      return this.expansionPanel ? 'Hide terminal shortcuts' : 'Show terminal shortcuts'
    }
  },
  methods: {
    async onAddTerminalShortcut (shortcut) {
      if (shortcut.unverified) {
        const confirmation = await this.$refs.unverified.promptForConfirmation()
        if (!confirmation) {
          return
        }
      }

      const isGardenTarget = get(shortcut, 'target') === TargetEnum.GARDEN
      if (!this.isAdmin && isGardenTarget) {
        const { data: projectMembers } = await getMembers({ namespace: this.shootNamespace })
        const serviceAccountName = `system:serviceaccount:${this.shootNamespace}:dashboard-webterminal`
        const member = find(projectMembers, ['username', serviceAccountName])
        const roles = get(member, 'roles')
        if (!includes(roles, 'admin')) {
          const confirmation = await this.$refs.serviceAccount.promptForConfirmation(member)
          if (!confirmation) {
            return
          }
        }
      }

      this.$emit('add-terminal-shortcut', shortcut)
    }
  }
}
</script>
