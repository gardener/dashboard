<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-list-item>
    <template #prepend>
      <g-icon-base
        width="24"
        height="23"
        icon-color="primary"
        view-box="-4 0 56 54"
        icon-name="terminal-shortcut"
      >
        <g-terminal-shortcut-icon />
      </g-icon-base>
    </template>
    <g-list-item-content>
      Terminal Shortcuts
      <template #description>
        Launch preconfigured terminals for frequently used views
      </template>
    </g-list-item-content>
    <template #append>
      <g-action-button
        :icon="expansionPanelIcon"
        :tooltip="expansionPanelTooltip"
        @click="expansionPanel = !expansionPanel"
      />
    </template>
  </g-list-item>
  <v-expand-transition appear>
    <v-card
      v-if="expansionPanel"
      flat
      class="ml-14 mt-2"
    >
      <v-card-text class="pa-0">
        <g-terminal-shortcuts
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

<script setup>
import {
  ref,
  computed,
  toRefs,
  inject,
} from 'vue'

import { useAuthnStore } from '@/store/authn'

import GListItem from '@/components/GListItem.vue'
import GListItemContent from '@/components/GListItemContent.vue'
import GActionButton from '@/components/GActionButton.vue'
import GTerminalShortcuts from '@/components/GTerminalShortcuts.vue'
import GIconBase from '@/components/icons/GIconBase.vue'
import GTerminalShortcutIcon from '@/components/icons/GTerminalShortcutIcon.vue'
import GUnverifiedTerminalShortcutsDialog from '@/components/dialogs/GUnverifiedTerminalShortcutsDialog.vue'
import GWebterminalServiceAccountDialog from '@/components/dialogs/GWebterminalServiceAccountDialog.vue'

import { useShootItem } from '@/composables/useShootItem'

import { TargetEnum } from '@/utils'

import includes from 'lodash/includes'
import find from 'lodash/find'
import get from 'lodash/get'

const api = inject('api')

const webterminalServiceAccountDialog = ref(null)
const unverifiedTerminalShortcutsDialog = ref(null)

const props = defineProps({
  popperBoundariesSelector: {
    type: String,
  },
})
const {
  popperBoundariesSelector,
} = toRefs(props)

const emit = defineEmits(['addTerminalShortcut'])
const authnStore = useAuthnStore()

const {
  shootNamespace,
} = useShootItem()

const expansionPanel = ref(false)

const expansionPanelIcon = computed(() => {
  return expansionPanel.value ? 'mdi-chevron-up' : 'mdi-chevron-down'
})

const expansionPanelTooltip = computed(() => {
  return expansionPanel.value ? 'Hide terminal shortcuts' : 'Show terminal shortcuts'
})

async function onAddTerminalShortcut (shortcut) {
  if (shortcut.unverified) {
    const confirmation = await unverifiedTerminalShortcutsDialog.value.promptForConfirmation()
    if (!confirmation) {
      return
    }
  }

  const isGardenTarget = get(shortcut, ['target']) === TargetEnum.GARDEN
  if (!authnStore.isAdmin && isGardenTarget) {
    const { data: projectMembers } = await api.getMembers({
      namespace: shootNamespace.value,
    })
    const serviceAccountName = `system:serviceaccount:${shootNamespace.value}:dashboard-webterminal`
    const member = find(projectMembers, ['username', serviceAccountName])
    const roles = get(member, ['roles'])
    if (!includes(roles, 'admin')) {
      const confirmation = await webterminalServiceAccountDialog.value.promptForConfirmation(member)
      if (!confirmation) {
        return
      }
    }
  }

  emit('addTerminalShortcut', shortcut)
}
</script>
