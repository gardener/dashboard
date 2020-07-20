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
    <v-list-item :value="shortcut" :disabled="disabled">
      <v-list-item-icon v-if="!hideIconSlot">
        <slot name="icon"></slot>
      </v-list-item-icon>
      <v-list-item-content class="py-0">
        <v-list-item-title>
          {{shortcut.title}}
          <v-tooltip top max-width="400px">
            <template v-slot:activator="{ on }">
              <v-chip
                v-on="on"
                v-if="isUnverified"
                small
                class="my-0 ml-2"
                outlined
                color="orange darken-2">
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
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <div v-on="on">
              <v-btn icon @click.stop="addTerminalShortcut(shortcut)" :disabled="disabled" class="enablePointerEvents">
                <v-icon>mdi-console-line</v-icon>
              </v-btn>
            </div>
          </template>
          <span v-if="!disabled">
            Create '<tt>{{shortcut.title}}</tt>' terminal session
          </span>
          <span v-else>
            Cluster is hibernated. Wake up cluster to open terminal
          </span>
        </v-tooltip>
      </v-list-item-action>
      <v-list-item-action class="mx-0">
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon @click.stop="expansionPanel = !expansionPanel" class="enablePointerEvents">
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
import CodeBlock from '@/components/CodeBlock'
import jsyaml from 'js-yaml'

export default {
  props: {
    shootItem: {
      type: Object,
      required: false
    },
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
      expansionPanel: false
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
    shortcutYaml () {
      return jsyaml.safeDump(this.shortcut, {
        skipInvalid: true
      })
    },
    isUnverified () {
      return this.shortcut[Symbol.for('unverified')]
    }
  },
  methods: {
    addTerminalShortcut (shortcut) {
      this.$emit('addTerminalShortcut', shortcut)
    },
    shortcutTargetDescription (shortcut) {
      return targetText(shortcut.target)
    }
  }
}
</script>

<style lang="scss" scoped>

  .wrap-text {
    white-space: normal;
  }

  ::v-deep .popper {
    text-align: initial;
  }

  .enablePointerEvents {
    pointer-events: auto !important;
  }

</style>
