<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-list-item>
    <template
      v-if="!hideIconSlot"
      #prepend
    >
      <slot name="icon" />
    </template>
    <g-list-item-content>
      {{ shortcut.title }}
      <v-tooltip
        v-if="isUnverified"
        location="top"
        max-width="400px"
      >
        <template #activator="{ props }">
          <v-chip
            v-bind="props"
            size="small"
            color="warning"
            variant="tonal"
            class="my-0 ml-2"
          >
            Unverified
          </v-chip>
        </template>
        This terminal shortcut was created by a member of this project and is not verified by the landscape administrator and therefore could be malicious
      </v-tooltip>
      <template
        v-if="shortcut.description"
        #description
      >
        {{ shortcut.description }}
      </template>
    </g-list-item-content>
    <v-spacer />
    <template
      v-if="!readOnly"
      #append
    >
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
    <v-card
      v-if="expansionPanel"
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
import { mapState } from 'pinia'
import yaml from 'js-yaml'

import { useAuthnStore } from '@/store/authn'
import { useAuthzStore } from '@/store/authz'

import { useShootItem } from '@/composables/useShootItem'

import {
  TargetEnum,
  targetText,
} from '@/utils'

import GCodeBlock from './GCodeBlock.vue'
import GActionButton from './GActionButton.vue'

import {
  get,
  join,
} from '@/lodash'

export default {
  components: {
    GActionButton,
    GCodeBlock,
  },
  inject: ['logger'],
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
  emits: [
    'addTerminalShortcut',
  ],
  setup () {
    const {
      shootItem,
      isShootStatusHibernated,
    } = useShootItem()

    return {
      shootItem,
      isShootStatusHibernated,
    }
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
  watch: {
    shortcut (value) {
      this.updateShortcutYaml(this.shortcut)
    },
  },
  created () {
    this.updateShortcutYaml(this.shortcut)
  },
  methods: {
    addTerminalShortcut (shortcut) {
      this.$emit('addTerminalShortcut', shortcut)
    },
    shortcutTargetDescription (shortcut) {
      return targetText(shortcut.target)
    },
    updateShortcutYaml (value) {
      try {
        this.shortcutYaml = yaml.dump(value)
      } catch (err) {
        this.logger.error(err)
      }
    },
  },
}
</script>
