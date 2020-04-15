<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <v-card v-if="isAdmin" three-line>
    <v-toolbar flat dark dense color="cyan darken-2">
      <v-toolbar-title class="subtitle-1">Gardenctl</v-toolbar-title>
    </v-toolbar>
    <v-list>
      <v-list-item v-for="({ title, value }, index) in commands" :key="title">
        <v-list-item-icon>
          <v-icon v-if="index === 0" color="cyan darken-2">mdi-console-line</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-subtitle>{{title}}</v-list-item-subtitle>
          <v-list-item-title>
            <code-block
              lang="shell"
              :content="'$ ' + value.replace(/ --/g, ' \\\n    --')"
              :show-copy-button="false"
            ></code-block>
          </v-list-item-title>
        </v-list-item-content>
        <v-list-item-action>
          <copy-btn :clipboard-text="value"></copy-btn>
        </v-list-item-action>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script>
import CopyBtn from '@/components/CopyBtn'
import CodeBlock from '@/components/CodeBlock'
import { shootItem } from '@/mixins/shootItem'
import { mapState, mapGetters } from 'vuex'
import get from 'lodash/get'

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
  computed: {
    ...mapState([
      'cfg'
    ]),
    ...mapGetters([
      'projectFromProjectList',
      'isAdmin'
    ]),
    projectName () {
      const project = this.projectFromProjectList
      return get(project, 'metadata.name')
    },
    commands () {
      return [
        {
          title: 'Target Seed',
          value: this.targetSeedCommand
        },
        {
          title: 'Target Shoot',
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
  }
}
</script>
