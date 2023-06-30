<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-list-item>
    <template v-slot:prepend>
      <g-icon-base
        width="24"
        height="23"
        icon-color="primary"
        view-box="-4 0 56 54"
      >
        <g-terminal-shortcut-icon/>
      </g-icon-base>
    </template>
    <g-list-item-content>
      Terminal Shortcuts
      <template>
        Launch preconfigured terminals for frequently used views
      </template>
    </g-list-item-content>
    <template v-slot:append>
      <g-action-button
        :icon="expansionPanelIcon"
        :tooltip="expansionPanelTooltip"
        @click="expansionPanel = !expansionPanel"
      />
    </template>
  </g-list-item>
  <v-expand-transition appear>
    <v-card v-if="expansionPanel" flat class="ml-14 mt-2">
      <v-card-text class="pa-0">
        <g-terminal-shortcuts
          :shoot-item="shootItem"
          :popper-boundaries-selector="popperBoundariesSelector"
          @add-terminal-shortcut="onAddTerminalShortcut"
        />
      </v-card-text>
    </v-card>
  </v-expand-transition>

  <g-unverified-terminal-shortcuts-dialog
    ref="unverified"
  />

  <g-webterminal-service-account-dialog
    ref="serviceAccount"
    :namespace="shootNamespace"
  />
</template>

<script>
import { defineComponent } from 'vue'
import { mapState } from 'pinia'

import { useAuthnStore } from '@/store'

import { shootItem } from '@/mixins/shootItem'

import GListItem from '@/components/GListItem.vue'
import GListItemContent from '@/components/GListItemContent.vue'
import GActionButton from '@/components/GActionButton.vue'
import GTerminalShortcuts from '@/components/GTerminalShortcuts.vue'
import GIconBase from '@/components/icons/GIconBase.vue'
import GTerminalShortcutIcon from '@/components/icons/GTerminalShortcutIcon.vue'
import GUnverifiedTerminalShortcutsDialog from '@/components/dialogs/GUnverifiedTerminalShortcutsDialog.vue'
import GWebterminalServiceAccountDialog from '@/components/dialogs/GWebterminalServiceAccountDialog.vue'

import { TargetEnum } from '@/utils'

import get from 'lodash/get'
import find from 'lodash/find'
import includes from 'lodash/includes'

export default defineComponent({
  components: {
    GListItem,
    GListItemContent,
    GActionButton,
    GTerminalShortcuts,
    GIconBase,
    GTerminalShortcutIcon,
    GUnverifiedTerminalShortcutsDialog,
    GWebterminalServiceAccountDialog,
  },
  inject: ['api'],
  mixins: [shootItem],
  props: {
    popperBoundariesSelector: {
      type: String,
    },
  },
  data () {
    return {
      expansionPanel: false,
    }
  },
  computed: {
    ...mapState(useAuthnStore, [
      'isAdmin',
    ]),
    expansionPanelIcon () {
      return this.expansionPanel ? 'mdi-chevron-up' : 'mdi-chevron-down'
    },
    expansionPanelTooltip () {
      return this.expansionPanel ? 'Hide terminal shortcuts' : 'Show terminal shortcuts'
    },
  },
  emits: ['addTerminalShortcut'],
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
        const { data: projectMembers } = await this.api.getMembers({ namespace: this.shootNamespace })
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

      this.$emit('addTerminalShortcut', shortcut)
    },
  },
})
</script>
