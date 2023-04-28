<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-list-item :value="shortcut" :disabled="disabled">
      <v-list-item-icon v-if="!hideIconSlot">
        <slot name="icon"></slot>
      </v-list-item-icon>
      <v-list-item-content class="py-0">
        <v-list-item-title>
          {{shortcut.title}}
          <v-tooltip v-if="isUnverified" location="top" max-width="400px">
            <template v-slot:activator="{ on }">
              <v-chip
                v-on="on"
                small
                class="my-0 ml-2 enablePointerEvents"
                variant="outlined"
                color="warning">
                Unverified
              </v-chip>
            </template>
            This terminal shortcut was created by a member of this project and is not verified by the landscape administrator and therefore could be malicious
          </v-tooltip>
        </v-list-item-title>
        <v-list-item-subtitle v-if="shortcut.description" class="py-1 wrap-text">
          {{shortcut.description}}
        </v-list-item-subtitle>
      </v-list-item-content>
      <v-list-item-action v-if="!readOnly" class="mx-0">
        <v-tooltip location="top">
          <template v-slot:activator="{ on }">
            <div v-on="on">
              <v-btn icon @click.stop="addTerminalShortcut(shortcut)" :disabled="disabled" class="enablePointerEvents" color="action-button">
                <v-icon>mdi-console-line</v-icon>
              </v-btn>
            </div>
          </template>
          <span v-if="!disabled">
            Create '<span class="font-family-monospace">{{shortcut.title}}</span>' terminal session
          </span>
          <span v-else>
            Cluster is hibernated. Wake up cluster to open terminal
          </span>
        </v-tooltip>
      </v-list-item-action>
      <v-list-item-action class="mx-0">
        <v-tooltip location="top">
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon @click.stop="expansionPanel = !expansionPanel" class="enablePointerEvents" color="action-button">
              <v-icon>{{visibilityIconShortcut}}</v-icon>
            </v-btn>
          </template>
          <span>{{shortcutVisibilityTitle}}</span>
        </v-tooltip>
      </v-list-item-action>
    </v-list-item>
    <v-expand-transition>
      <v-card v-if="expansionPanel" flat>
        <code-block lang="yaml" :content="shortcutYaml" :show-copy-button="false"></code-block>
      </v-card>
    </v-expand-transition>
  </div>
</template>

<script>

import { mapGetters } from 'vuex'
import { shootItem } from '@/mixins/shootItem'
import get from 'lodash/get'
import join from 'lodash/join'
import { TargetEnum, targetText } from '@/utils'
import CodeBlock from '@/components/CodeBlock.vue'

export default {
  props: {
    shortcut: {
      type: Object,
      required: true
    },
    popperBoundariesSelector: {
      type: String
    },
    hideIconSlot: {
      type: Boolean,
      default: false
    },
    readOnly: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      expansionPanel: false,
      shortcutYaml: ''
    }
  },
  mixins: [shootItem],
  components: {
    CodeBlock
  },
  computed: {
    ...mapGetters([
      'canCreateTerminals',
      'hasGardenTerminalAccess',
      'hasControlPlaneTerminalAccess',
      'hasShootTerminalAccess',
      'isAdmin'
    ]),
    image () {
      return get(this.shortcut, 'container.image', 'default')
    },
    command () {
      const command = get(this.shortcut, 'container.command')
      return join(command, ' ')
    },
    args () {
      const args = get(this.shortcut, 'container.args')
      return join(args, ' ')
    },
    disabled () {
      const target = this.shortcut.target
      if (this.shootItem && !this.isShootStatusHibernated) {
        return false
      }
      if (target !== TargetEnum.SHOOT) {
        return false
      }

      return true
    },
    visibilityIconShortcut () {
      return this.expansionPanel ? 'mdi-eye-off' : 'mdi-eye'
    },
    shortcutVisibilityTitle () {
      return this.expansionPanel ? 'Hide Shortcut' : 'Show Shortcut'
    },
    isUnverified () {
      return !!this.shortcut.unverified
    }
  },
  methods: {
    addTerminalShortcut (shortcut) {
      this.$emit('add-terminal-shortcut', shortcut)
    },
    shortcutTargetDescription (shortcut) {
      return targetText(shortcut.target)
    },
    async updateShortcutYaml (value) {
      this.shortcutYaml = await this.$yaml.dump(value)
    }
  },
  created () {
    this.updateShortcutYaml(this.shortcut)
  },
  watch: {
    async shortcut (value) {
      this.updateShortcutYaml(this.shortcut)
    }
  }
}
</script>

<style lang="scss" scoped>

  :deep(.popper) {
    text-align: initial;
  }

  .enablePointerEvents {
    pointer-events: auto !important;
  }

</style>
