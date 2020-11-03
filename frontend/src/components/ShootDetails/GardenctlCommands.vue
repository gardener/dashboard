<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-list>
    <template v-for="({ title, subtitle, value }, index) in commands">
      <v-list-item :key="title">
        <v-list-item-icon>
          <v-icon v-if="index === 0" color="cyan darken-2">mdi-console-line</v-icon>
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
              <v-btn v-on="on" icon @click.native.stop="toggle(index)">
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
            :content="'$ ' + value.replace(/ --/g, ' \\\n    --')"
            :show-copy-button="false"
          ></code-block>
        </v-list-item-content>
      </v-list-item>
    </template>
  </v-list>
</template>

<script>
import CopyBtn from '@/components/CopyBtn'
import CodeBlock from '@/components/CodeBlock'
import { shootItem } from '@/mixins/shootItem'
import { mapState, mapGetters } from 'vuex'
import get from 'lodash/get'
import Vue from 'vue'

export default {
  components: {
    CopyBtn,
    CodeBlock
  },
  props: {
    shootItem: {
      type: Object
    }
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
      'projectFromProjectList'
    ]),
    projectName () {
      const project = this.projectFromProjectList
      return get(project, 'metadata.name')
    },
    commands () {
      return [
        {
          title: 'Target Control Plane',
          subtitle: 'Gardenctl command to target the shoot namespace on the seed cluster',
          value: this.targetSeedCommand
        },
        {
          title: 'Target Cluster',
          subtitle: 'Gardenctl command to target the shoot cluster',
          value: this.targetShootCommand
        }
      ]
    },
    targetSeedCommand () {
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
    targetShootCommand () {
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
  ::v-deep .hljs-meta {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    user-select: none;
  }
</style>
