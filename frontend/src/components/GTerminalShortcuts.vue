<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <template v-if="projectShortcuts.length || shortcuts.length">
    <g-terminal-shortcut
      v-for="shortcut in projectShortcuts"
      :key="`project-shortcut-${shortcut.id}`"
      :shoot-item="shootItem"
      :shortcut="shortcut"
      :popper-boundaries-selector="popperBoundariesSelector"
      @add-terminal-shortcut="onAddTerminalShortcut"
    >
      <template #icon>
        <v-tooltip location="top">
          <template #activator="{ props }">
            <span v-bind="props">
              <v-badge
                avatar
                location="bottom right"
                color="transparent"
              >
                <template #badge>
                  <v-icon
                    icon="mdi-grid-large"
                    color="primary"
                  />
                </template>
                <span>
                  <g-icon-base
                    width="24"
                    height="23"
                    icon-color="primary"
                    view-box="-4 0 56 54"
                  >
                    <g-terminal-shortcut-icon />
                  </g-icon-base>
                </span>
              </v-badge>
            </span>
          </template>
          Project specific terminal shortcut
        </v-tooltip>
      </template>
    </g-terminal-shortcut>
    <g-terminal-shortcut
      v-for="shortcut in shortcuts"
      :key="`g-shortcut-${shortcut.id}`"
      :shoot-item="shootItem"
      :shortcut="shortcut"
      :popper-boundaries-selector="popperBoundariesSelector"
      @add-terminal-shortcut="onAddTerminalShortcut"
    >
      <template #icon>
        <v-tooltip location="top">
          <template #activator="{ props }">
            <span v-bind="props">
              <g-icon-base
                width="24"
                height="23"
                icon-color="primary"
                view-box="-4 0 56 54"
              >
                <g-terminal-shortcut-icon />
              </g-icon-base>
            </span>
          </template>
          Default terminal shortcut
        </v-tooltip>
      </template>
    </g-terminal-shortcut>
  </template>
  <g-list-item
    v-else
    disabled
  >
    <!-- should not be selectable -->
    <g-list-item-content>
      No terminal shortcuts available
    </g-list-item-content>
  </g-list-item>
</template>

<script>
import { mapActions } from 'pinia'

import { TargetEnum } from '@/utils'
import {
  filter,
  get,
  every,
} from '@/utils/lodash'
import { useTerminalStore } from '@/store'

import GListItem from './GListItem.vue'
import GListItemContent from './GListItemContent.vue'
import GTerminalShortcut from './GTerminalShortcut.vue'
import GIconBase from './icons/GIconBase.vue'
import GTerminalShortcutIcon from './icons/GTerminalShortcutIcon.vue'

function shootSelectorFilter (shortcuts, shootItem) {
  return filter(shortcuts, shortcut => {
    const matchLabels = get(shortcut, 'shootSelector.matchLabels')
    if (!matchLabels) {
      return true
    }
    const matchesLabels = every(matchLabels, (value, key) => get(shootItem, ['metadata', 'labels', key]) === value)
    return matchesLabels
  })
}

export default {
  components: {
    GListItem,
    GListItemContent,
    GTerminalShortcut,
    GIconBase,
    GTerminalShortcutIcon,
  },
  props: {
    shootItem: {
      type: Object,
    },
    popperBoundariesSelector: {
      type: String,
    },
  },
  emits: [
    'addTerminalShortcut',
  ],
  computed: {
    allPossibleTargets () {
      const targetsFilter = [TargetEnum.GARDEN]
      if (this.shootItem) {
        targetsFilter.push(TargetEnum.SHOOT, TargetEnum.CONTROL_PLANE)
      }
      return targetsFilter
    },
    projectShortcuts () {
      const shortcuts = this.projectTerminalShortcutsByTargetsFilter(this.allPossibleTargets)
      return shootSelectorFilter(shortcuts, this.shootItem)
    },
    shortcuts () {
      const shortcuts = this.terminalShortcutsByTargetsFilter(this.allPossibleTargets)
      return shootSelectorFilter(shortcuts, this.shootItem)
    },
  },
  methods: {
    ...mapActions(useTerminalStore, [
      'projectTerminalShortcutsByTargetsFilter',
      'terminalShortcutsByTargetsFilter',
    ]),
    onAddTerminalShortcut (shortcut) {
      this.$emit('addTerminalShortcut', shortcut)
    },
  },
}
</script>
