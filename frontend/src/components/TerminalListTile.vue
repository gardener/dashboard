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
  <v-list-tile>
    <v-list-tile-action>
      <v-icon class="cyan--text text--darken-2">mdi-console</v-icon>
    </v-list-tile-action>
    <v-list-tile-content>
      <v-list-tile-title>Terminal</v-list-tile-title>
      <v-list-tile-sub-title>{{description}}</v-list-tile-sub-title>
    </v-list-tile-content>
    <v-list-tile-action>
      <v-tooltip top>
        <v-btn slot="activator" icon :to=to :disabled="disabled">
          <v-icon>mdi-console-line</v-icon>
        </v-btn>
        <span>{{buttonDescription || description}}</span>
      </v-tooltip>
    </v-list-tile-action>
  </v-list-tile>
</template>

<script>
import { shootItem } from '@/mixins/shootItem'

export default {
  mixins: [shootItem],
  props: {
    shootItem: {
      type: Object
    },
    target: {
      type: String
    },
    description: {
      type: String
    },
    buttonDescription: {
      type: String
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    to () {
      return {
        name: 'ShootItemTerminal',
        params: {
          namespace: this.shootNamespace,
          name: this.shootName
        }
      }
    }
  }
}
</script>
