<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-list>
    <template v-for="({ title, subtitle, value, displayValue }, index) in commands">
      <v-list-item :key="title">
        <v-list-item-icon>
          <v-icon v-if="index === 0" color="primary">mdi-console-line</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>{{title}}</v-list-item-title>
          <v-list-item-subtitle>{{subtitle}}</v-list-item-subtitle>
        </v-list-item-content>
        <v-list-item-action>
          <copy-btn :clipboard-text="value"></copy-btn>
        </v-list-item-action>
        <v-list-item-action class="mx-0">
          <v-tooltip top>
            <template v-slot:activator="{ on }">
              <v-btn v-on="on" icon @click.native.stop="toggle(index)" color="action-button">
                <v-icon>{{visibilityIcon(index)}}</v-icon>
              </v-btn>
            </template>
            <span>{{visibilityTitle(index)}}</span>
          </v-tooltip>
        </v-list-item-action>
        <v-list-item-action class="mx-0">
          <g-popper
            title="Customize Gardenctl Commands"
            popper-key="gardenctl"
          >
            <template v-slot:popperRef>
              <v-btn icon  color="action-button">
                <v-tooltip top>
                  <template v-slot:activator="{ on }">
                    <v-icon v-on="on">mdi-cog-outline</v-icon>
                  </template>
                  <span>Instructions on how to customize the <span class="font-family-monospace">gardenctl</span> commands</span>
                </v-tooltip>
              </v-btn>
            </template>
            <v-list class="py-0">
              <v-list-item class="px-0">
                <v-list-item-icon>
                  <v-icon>mdi-information-outline</v-icon>
                </v-list-item-icon>
                <v-list-item-content>
                  <span>Go to <router-link :to="{ name: 'Account', query: { namespace: shootNamespace } }">My Account</router-link> to customize the <span class="font-family-monospace">gardenctl</span> command</span>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </g-popper>
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
import GPopper from '@/components/GPopper'
import CopyBtn from '@/components/CopyBtn'
import CodeBlock from '@/components/CodeBlock'
import { shootItem } from '@/mixins/shootItem'
import { mapState, mapGetters } from 'vuex'
import get from 'lodash/get'
import includes from 'lodash/includes'
import Vue from 'vue'

export default {
  components: {
    CopyBtn,
    CodeBlock,
    GPopper
  },
  mixins: [shootItem],
  data () {
    return {
      expansionPanel: []
    }
  },
  computed: {
    ...mapState([
      'cfg',
      'gardenctlOptions'
    ]),
    ...mapGetters([
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
          .replace(/ &&/g, ' \\\n  &&')
      }

      const gardenctlVersion = this.legacyCommands ? 'Legacy gardenctl' : 'Gardenctl-v2'
      const additionalInfo = this.legacyCommands ? '' : `(${this.shell})`
      return [
        {
          title: 'Target Control Plane',
          subtitle: `${gardenctlVersion} command to target the control plane of the shoot cluster ${additionalInfo}`,
          value: this.targetControlPlaneCommand,
          displayValue: displayValue(this.targetControlPlaneCommand)
        },
        {
          title: 'Target Cluster',
          subtitle: `${gardenctlVersion} command to target the shoot cluster ${additionalInfo}`,
          value: this.targetShootCommand,
          displayValue: displayValue(this.targetShootCommand)
        }
      ]
    },
    legacyCommands () {
      return get(this.gardenctlOptions, 'legacyCommands', false)
    },
    shell () {
      const shell = get(this.gardenctlOptions, 'shell')

      if (!includes(['bash', 'fish', 'powershell', 'zsh'], shell)) {
        return 'bash'
      }

      return shell
    },
    targetControlPlaneCommand () {
      if (this.legacyCommands) {
        return this.targetControlPlaneCommandV1
      }

      return this.targetControlPlaneCommandV2
    },
    targetShootCommand () {
      if (this.legacyCommands) {
        return this.targetShootCommandV1
      }

      return this.targetShootCommandV2
    },
    targetControlPlaneCommandV1 () {
      const args = []
      if (this.cfg.apiServerUrl) {
        args.push(`--server ${this.cfg.apiServerUrl}`)
      }
      if (this.shootSeedName) {
        args.push(`--seed ${this.shootSeedName}`)
      }
      if (this.shootTechnicalId) {
        args.push(`--namespace ${this.shootTechnicalId}`)
      }

      return `gardenctl target ${args.join(' ')}`
    },
    targetControlPlaneCommandV2 () {
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

      return `gardenctl target ${args.join(' ')} && ${this.kubectlEnvCommandV2}`
    },
    targetShootCommandV1 () {
      const args = []
      if (this.cfg.apiServerUrl) {
        args.push(`--server ${this.cfg.apiServerUrl}`)
      }
      if (this.projectName) {
        args.push(`--project ${this.projectName}`)
      }
      if (this.shootName) {
        args.push(`--shoot ${this.shootName}`)
      }

      return `gardenctl target ${args.join(' ')}`
    },
    targetShootCommandV2 () {
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

      return `gardenctl target ${args.join(' ')} && ${this.kubectlEnvCommandV2}`
    },
    kubectlEnvCommandV2 () {
      return this.invokeCommandString(`gardenctl kubectl-env ${this.shell}`)
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
    },
    invokeCommandString (command) {
      switch (this.shell) {
        case 'powershell':
          return `& ${command} | Invoke-Expression`
        case 'fish':
          return `eval (${command})`
        default:
          return `eval $(${command})`
      }
    }
  }
}
</script>

<style scoped>
  ::v-deep .hljs-meta {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    user-select: none;
  }
</style>
