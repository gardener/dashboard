<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-list-item>
    <v-list-item-icon>
      <v-icon color="cyan darken-2">mdi-console</v-icon>
    </v-list-item-icon>
    <v-list-item-content>
      <v-list-item-title>Terminal</v-list-item-title>
      <v-list-item-subtitle class="pt-1">{{description}}</v-list-item-subtitle>
    </v-list-item-content>
    <v-list-item-action>
      <v-tooltip top>
        <template v-slot:activator="{ on }">
          <div v-on="on">
            <v-btn icon :to=to :disabled="disabled">
              <v-icon>mdi-console-line</v-icon>
            </v-btn>
          </div>
        </template>
        <span>{{buttonDescription || description}}</span>
      </v-tooltip>
    </v-list-item-action>
  </v-list-item>
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
