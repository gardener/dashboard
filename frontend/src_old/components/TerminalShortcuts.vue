<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <template v-if="projectShortcuts.length || shortcuts.length">
      <template v-for="shortcut in projectShortcuts" :key="`project-shortcut-${shortcut.id}`">
        <terminal-shortcut
          :shoot-item="shootItem"
          :shortcut="shortcut"
          :popper-boundaries-selector="popperBoundariesSelector"
          @add-terminal-shortcut="onAddTerminalShortcut"
        >
          <template v-slot:icon>
            <v-tooltip location="top">
              <template v-slot:activator="{ on: tooltip }">
                <span v-on="tooltip" >
                  <v-badge
                    avatar
                    overlap
                    bordered
                    bottom
                    color="transparent"
                  >
                    <template v-slot:badge>
                      <v-avatar>
                        <v-icon color="primary">mdi-grid-large</v-icon>
                      </v-avatar>
                    </template>
                    <icon-base width="24" height="23" icon-color="primary" view-box="-4 0 56 54">
                      <terminal-shortcut-icon></terminal-shortcut-icon>
                    </icon-base>
                  </v-badge>
                </span>
              </template>
              Project specific terminal shortcut
            </v-tooltip>
          </template>
        </terminal-shortcut>
      </template>
      <template v-for="shortcut in shortcuts" :key="`g-shortcut-${shortcut.id}`">
        <terminal-shortcut
          :shoot-item="shootItem"
          :shortcut="shortcut"
          :popper-boundaries-selector="popperBoundariesSelector"
          @add-terminal-shortcut="onAddTerminalShortcut"
        >
          <template v-slot:icon>
            <v-tooltip location="top">
              <template v-slot:activator="{ on: tooltip }">
                <span v-on="tooltip" >
                  <icon-base width="24" height="23" icon-color="primary" view-box="-4 0 56 54">
                    <terminal-shortcut-icon></terminal-shortcut-icon>
                  </icon-base>
                </span>
              </template>
              Default terminal shortcut
            </v-tooltip>
          </template>
        </terminal-shortcut>
      </template>
    </template>
    <v-list-item v-else disabled><!-- should not be selectable -->
      <v-list-item-content>
        <v-list-item-title>No terminal shortcuts available</v-list-item-title>
      </v-list-item-content>
    </v-list-item>
  </div>
</template>

<script>

import { mapGetters } from 'vuex'
import TerminalShortcut from '@/components/TerminalShortcut.vue'
import IconBase from '@/components/icons/IconBase.vue'
import TerminalShortcutIcon from '@/components/icons/TerminalShortcutIcon.vue'
import { TargetEnum } from '@/utils'
import filter from 'lodash/filter'
import get from 'lodash/get'
import every from 'lodash/every'

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
  props: {
    shootItem: {
      type: Object
    },
    popperBoundariesSelector: {
      type: String
    }
  },
  components: {
    TerminalShortcut,
    IconBase,
    TerminalShortcutIcon
  },
  computed: {
    ...mapGetters([
      'projectTerminalShortcutsByTargetsFilter',
      'terminalShortcutsByTargetsFilter'
    ]),
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
    }
  },
  methods: {
    onAddTerminalShortcut (shortcut) {
      this.$emit('add-terminal-shortcut', shortcut)
    }
  }
}
</script>
