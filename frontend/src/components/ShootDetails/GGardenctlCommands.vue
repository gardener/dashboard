<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <template
    v-for="({ title, subtitle, value, displayValue }, index) in commands"
    :key="title"
  >
    <g-list-item>
      <template
        v-if="index === 0"
        #prepend
      >
        <v-icon
          icon="mdi-console-line"
          color="primary"
        />
      </template>
      <g-list-item-content>
        {{ title }}
        <template #description>
          {{ subtitle }}
        </template>
      </g-list-item-content>
      <template #append>
        <g-gardenctl-info />
        <g-copy-btn :clipboard-text="value" />
        <g-action-button
          :icon="visibilityIcon(index)"
          :tooltip="visibilityTitle(index)"
          @click="toggle(index)"
        />
      </template>
    </g-list-item>
    <g-list-item
      v-if="expansionPanel[index]"
      :key="'expansion-' + title"
    >
      <g-list-item-content>
        <g-code-block
          lang="shell"
          :content="displayValue"
          :show-copy-button="false"
        />
      </g-list-item-content>
    </g-list-item>
  </template>
</template>

<script>
import { mapState } from 'pinia'

import { useAuthnStore } from '@/store/authn'
import { useConfigStore } from '@/store/config'
import { useProjectStore } from '@/store/project'

import GListItem from '@/components/GListItem.vue'
import GListItemContent from '@/components/GListItemContent.vue'
import GActionButton from '@/components/GActionButton.vue'
import GCopyBtn from '@/components/GCopyBtn.vue'
import GCodeBlock from '@/components/GCodeBlock.vue'
import GGardenctlInfo from '@/components/GGardenctlInfo.vue'

import { shootItem } from '@/mixins/shootItem'

import { get } from '@/lodash'

export default {
  components: {
    GListItem,
    GListItemContent,
    GActionButton,
    GCopyBtn,
    GCodeBlock,
    GGardenctlInfo,
  },
  mixins: [shootItem],
  data () {
    return {
      expansionPanel: [],
    }
  },
  computed: {
    ...mapState(useConfigStore, [
      'clusterIdentity',
    ]),
    ...mapState(useAuthnStore, [
      'isAdmin',
    ]),
    ...mapState(useProjectStore, [
      'projectFromProjectList',
    ]),
    projectName () {
      const project = this.projectFromProjectList
      return get(project, 'metadata.name')
    },
    commands () {
      const displayValue = command => {
        return '$ ' + command
          .replace(/ --/g, ' \\\n    --')
      }

      const cmds = [
        {
          title: 'Target Cluster',
          subtitle: 'Gardenctl command to target the shoot cluster',
          value: this.targetShootCommand,
          displayValue: displayValue(this.targetShootCommand),
        },
      ]

      if (this.isAdmin) {
        cmds.unshift({
          title: 'Target Control Plane',
          subtitle: 'Gardenctl command to target the control plane of the shoot cluster',
          value: this.targetControlPlaneCommand,
          displayValue: displayValue(this.targetControlPlaneCommand),
        })
      }
      return cmds
    },
    targetControlPlaneCommand () {
      const args = []
      if (this.clusterIdentity) {
        args.push(`--garden ${this.clusterIdentity}`)
      }
      if (this.projectName) {
        args.push(`--project ${this.projectName}`)
      }
      if (this.shootName) {
        args.push(`--shoot ${this.shootName}`)
      }

      args.push('--control-plane')

      return `gardenctl target ${args.join(' ')}`
    },
    targetShootCommand () {
      const args = []
      if (this.clusterIdentity) {
        args.push(`--garden ${this.clusterIdentity}`)
      }
      if (this.projectName) {
        args.push(`--project ${this.projectName}`)
      }
      if (this.shootName) {
        args.push(`--shoot ${this.shootName}`)
      }

      return `gardenctl target ${args.join(' ')}`
    },
  },
  methods: {
    visibilityIcon (index) {
      return this.expansionPanel[index] ? 'mdi-eye-off' : 'mdi-eye'
    },
    visibilityTitle (index) {
      return this.expansionPanel[index] ? 'Hide Command' : 'Show Command'
    },
    toggle (index) {
      this.expansionPanel[index] = !this.expansionPanel[index]
    },
  },
}
</script>

<style scoped>
  :deep(.hljs-meta) {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    user-select: none;
  }
</style>
@/lodash
