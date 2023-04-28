<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-list>
    <template v-for="({ title, subtitle, value, displayValue }, index) in commands" :key="title">
      <v-list-item>
        <v-list-item-icon>
          <v-icon v-if="index === 0" color="primary">mdi-console-line</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>{{title}}</v-list-item-title>
          <v-list-item-subtitle>
            {{subtitle}}
          </v-list-item-subtitle>
        </v-list-item-content>
        <v-list-item-action class="mx-0">
          <gardenctl-info></gardenctl-info>
        </v-list-item-action>
        <v-list-item-action>
          <copy-btn :clipboard-text="value"></copy-btn>
        </v-list-item-action>
        <v-list-item-action class="mx-0">
          <v-tooltip location="top">
            <template v-slot:activator="{ on }">
              <v-btn v-on="on" icon @click.stop="toggle(index)" color="action-button">
                <v-icon>{{visibilityIcon(index)}}</v-icon>
              </v-btn>
            </template>
            <span>{{visibilityTitle(index)}}</span>
          </v-tooltip>
        </v-list-item-action>
      </v-list-item>
      <v-list-item v-if="expansionPanel[index]" :key="'expansion-' + title">
        <v-list-item-icon></v-list-item-icon>
        <v-list-item-content class="pt-0">
          <code-block
            lang="shell"
            :content="displayValue"
            :show-copy-button="false"
          ></code-block>
        </v-list-item-content>
      </v-list-item>
    </template>
  </v-list>
</template>

<script>
import CopyBtn from '@/components/CopyBtn.vue'
import CodeBlock from '@/components/CodeBlock.vue'
import GardenctlInfo from '@/components/GardenctlInfo.vue'
import { shootItem } from '@/mixins/shootItem'
import { mapState, mapGetters } from 'vuex'
import get from 'lodash/get'
import Vue from 'vue'

export default {
  components: {
    CopyBtn,
    CodeBlock,
    GardenctlInfo
  },
  mixins: [shootItem],
  data () {
    return {
      expansionPanel: []
    }
  },
  computed: {
    ...mapState([
      'cfg'
    ]),
    ...mapGetters([
      'isAdmin',
      'projectFromProjectList'
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
          displayValue: displayValue(this.targetShootCommand)
        }
      ]

      if (this.isAdmin) {
        cmds.unshift({
          title: 'Target Control Plane',
          subtitle: 'Gardenctl command to target the control plane of the shoot cluster',
          value: this.targetControlPlaneCommand,
          displayValue: displayValue(this.targetControlPlaneCommand)
        })
      }
      return cmds
    },
    targetControlPlaneCommand () {
      const args = []
      if (this.cfg.clusterIdentity) {
        args.push(`--garden ${this.cfg.clusterIdentity}`)
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
      if (this.cfg.clusterIdentity) {
        args.push(`--garden ${this.cfg.clusterIdentity}`)
      }
      if (this.projectName) {
        args.push(`--project ${this.projectName}`)
      }
      if (this.shootName) {
        args.push(`--shoot ${this.shootName}`)
      }

      return `gardenctl target ${args.join(' ')}`
    }
  },
  methods: {
    visibilityIcon (index) {
      return this.expansionPanel[index] ? 'mdi-eye-off' : 'mdi-eye'
    },
    visibilityTitle (index) {
      return this.expansionPanel[index] ? 'Hide Command' : 'Show Command'
    },
    toggle (index) {
      Vue.set(this.expansionPanel, index, !this.expansionPanel[index])
    }
  }
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
