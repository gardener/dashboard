<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <div>
    <template v-if="projectShortcuts.length || shortcuts.length">
      <template v-for="shortcut in projectShortcuts">
        <terminal-shortcut
          :shootItem="shootItem"
          :shortcut="shortcut"
          :key="`project-shortcut-${shortcutId(shortcut)}`"
          :popper-boundaries-selector="popperBoundariesSelector"
          @addTerminalShortcut="onAddTerminalShortcut"
        >
          <template v-slot:icon>
            <v-tooltip top>
              <template v-slot:activator="{ on: tooltip }">
                <span v-on="tooltip" >
                  <v-badge
                    avatar
                    overlap
                    bordered
                    bottom
                    color="#0097a7"
                  >
                    <template v-slot:badge>
                      <v-avatar>
                        <v-icon>mdi-grid-large</v-icon>
                      </v-avatar>
                    </template>
                    <icon-base width="24" height="23" iconColor="#0097a7" viewBox="-4 0 56 54">
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
      <template v-for="shortcut in shortcuts">
        <terminal-shortcut
          :shoot-item="shootItem"
          :shortcut="shortcut"
          :key="`g-shortcut-${shortcutId(shortcut)}`"
          :popper-boundaries-selector="popperBoundariesSelector"
          @addTerminalShortcut="onAddTerminalShortcut"
        >
          <template v-slot:icon>
            <v-tooltip top>
              <template v-slot:activator="{ on: tooltip }">
                <span v-on="tooltip" >
                  <icon-base width="24" height="23" iconColor="#0097a7" viewBox="-4 0 56 54">
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
import TerminalShortcut from '@/components/TerminalShortcut'
import IconBase from '@/components/icons/IconBase'
import TerminalShortcutIcon from '@/components/icons/TerminalShortcutIcon'
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
      'projectTerminalShortcuts',
      'terminalShortcuts'
    ]),
    allPossibleTargets () {
      const targetsFilter = [TargetEnum.GARDEN]
      if (this.shootItem) {
        targetsFilter.push(TargetEnum.SHOOT, TargetEnum.CONTROL_PLANE)
      }
      return targetsFilter
    },
    projectShortcuts () {
      const shortcuts = this.projectTerminalShortcuts({ targetsFilter: this.allPossibleTargets })
      return shootSelectorFilter(shortcuts, this.shootItem)
    },
    shortcuts () {
      const shortcuts = this.terminalShortcuts({ targetsFilter: this.allPossibleTargets })
      return shootSelectorFilter(shortcuts, this.shootItem)
    }
  },
  methods: {
    onAddTerminalShortcut (shortcut) {
      this.$emit('addTerminalShortcut', shortcut)
    },
    shortcutId (shortcut) {
      return shortcut[Symbol.for('id')]
    }
  }
}
</script>
