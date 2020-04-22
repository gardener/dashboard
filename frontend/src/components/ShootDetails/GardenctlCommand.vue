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
  <div>
    <v-list-item>
      <v-list-item-icon>
        <v-icon v-if="isFirstItem" color="cyan darken-2">mdi-console-line</v-icon>
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
            <v-btn v-on="on" icon @click.native.stop="expansionPanel = !expansionPanel">
              <v-icon>{{visibilityIcon}}</v-icon>
            </v-btn>
          </template>
          <span>{{visibilityTitle}}</span>
        </v-tooltip>
      </v-list-item-action>
    </v-list-item>
    <v-list-item v-if="expansionPanel">
      <v-list-item-icon></v-list-item-icon>
      <v-list-item-content>
        <code-block
          lang="shell"
          :content="'$ ' + value.replace(/ --/g, ' \\\n    --')"
          :show-copy-button="false"
        ></code-block>
      </v-list-item-content>
    </v-list-item>
  </div>
</template>

<script>
import CopyBtn from '@/components/CopyBtn'
import CodeBlock from '@/components/CodeBlock'

export default {
  components: {
    CopyBtn,
    CodeBlock
  },
  props: {
    title: {
      type: String
    },
    subtitle: {
      type: String
    },
    value: {
      type: String
    },
    isFirstItem: {
      type: Boolean
    }
  },
  data () {
    return {
      expansionPanel: false
    }
  },
  computed: {
    visibilityIcon () {
      if (this.expansionPanel) {
        return 'visibility_off'
      } else {
        return 'visibility'
      }
    },
    visibilityTitle () {
      if (this.expansionPanel) {
        return 'Hide Command'
      } else {
        return 'Show Command'
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
