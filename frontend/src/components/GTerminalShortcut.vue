<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-list-item>
    <template v-if="!hideIconSlot" #prepend>
      <slot name="icon"/>
    </template>
    <g-list-item-content>
      {{shortcut.title}}
      <v-tooltip v-if="isUnverified" location="top" max-width="400px">
        <template #activator="{ props }">
          <v-chip
            v-bind="props"
            small
            color="warning"
            variant="outlined"
            class="my-0 ml-2"
          >
            Unverified
          </v-chip>
        </template>
        This terminal shortcut was created by a member of this project and is not verified by the landscape administrator and therefore could be malicious
      </v-tooltip>
      <template v-if="shortcut.description" #description>
        {{ shortcut.description }}
      </template>
    </g-list-item-content>
    <v-spacer/>
    <template v-if="!readOnly" #append>
      <g-action-button
        icon="mdi-console-line"
        :disabled="disabled"
        @click.stop="addTerminalShortcut(shortcut)"
      >
        <template #tooltip>
          <span v-if="!disabled">
            Create
            '<span class="font-family-monospace">{{ shortcut.title }}</span>'
            terminal session
          </span>
          <span v-else>
            Cluster is hibernated. Wake up cluster to open terminal
          </span>
        </template>
      </g-action-button>
      <g-action-button
        :icon="visibilityIconShortcut"
        :tooltip="shortcutVisibilityTitle"
        @click.stop="expansionPanel = !expansionPanel"
      />
    </template>
  </g-list-item>
  <v-expand-transition>
    <v-card v-if="expansionPanel"
      flat
    >
      <g-code-block
        lang="yaml"
        :content="shortcutYaml"
        :show-copy-button="false"
      />
    </v-card>
  </v-expand-transition>
</template>

<script>
import { defineComponent } from 'vue'
import { mapState } from 'pinia'

import { useAuthnStore, useAuthzStore } from '@/store'

import GActionButton from './GActionButton.vue'
import GCodeBlock from './GCodeBlock.vue'

import { shootItem } from '@/mixins/shootItem'

import { TargetEnum, targetText } from '@/utils'

import get from 'lodash/get'
import join from 'lodash/join'

export default defineComponent({
  components: {
    GActionButton,
    GCodeBlock,
  },
  mixins: [shootItem],
  inject: ['yaml'],
  props: {
    shortcut: {
      type: Object,
      required: true,
    },
    popperBoundariesSelector: {
      type: String,
    },
    hideIconSlot: {
      type: Boolean,
      default: false,
    },
    readOnly: {
      type: Boolean,
      default: false,
    },
  },
  data () {
    return {
      expansionPanel: false,
      shortcutYaml: '',
    }
  },
  computed: {
    ...mapState(useAuthnStore, [
      'isAdmin',
    ]),
    ...mapState(useAuthzStore, [
      'canCreateTerminals',
      'hasGardenTerminalAccess',
      'hasControlPlaneTerminalAccess',
      'hasShootTerminalAccess',
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
    },
  },
  emits: [
    'addTerminalShortcut',
  ],
  methods: {
    addTerminalShortcut (shortcut) {
      this.$emit('addTerminalShortcut', shortcut)
    },
    shortcutTargetDescription (shortcut) {
      return targetText(shortcut.target)
    },
    async updateShortcutYaml (value) {
      try {
        this.shortcutYaml = await this.yaml.dump(value)
      } catch (error) {
        console.log(error)
      }
    },
  },
  created () {
    this.updateShortcutYaml(this.shortcut)
  },
  watch: {
    async shortcut (value) {
      this.updateShortcutYaml(this.shortcut)
    },
  },
})
</script>
