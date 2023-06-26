<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card v-if="items.length">
    <v-toolbar flat dense color="toolbar-background toolbar-title--text">
      <v-toolbar-title class="text-subtitle-1">External Tools</v-toolbar-title>
    </v-toolbar>
    <v-list>
      <template v-for="({ title, url, icon }, index) in items" :key="title">
        <v-divider v-if="index" :key="index" inset class="my-2"></v-divider>
        <v-list-item>
          <v-list-item-icon>
            <v-icon color="primary">{{icon || 'link'}}</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-subtitle>{{title}}</v-list-item-subtitle>
            <v-list-item-title>
              <g-external-link :url="expandUrl(url)">
                {{expandUrl(url)}}
              </g-external-link>
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </template>
    </v-list>
  </v-card>
</template>

<script>
import get from 'lodash/get'
import { parseTemplate } from 'url-template'
import GExternalLink from '@/components/GExternalLink'
import { shootItem } from '@/mixins/shootItem'
import { mapState } from 'pinia'

import { useConfigStore } from '@/store'

export default {
  components: {
    GExternalLink,
  },
  mixins: [shootItem],
  computed: {
    ...mapState(useConfigStore, ['externalTools']),
    items () {
      return get(this, 'externalTools', [])
    },
  },
  methods: {
    expandUrl (url) {
      try {
        return parseTemplate(url).expand(this.shootMetadata)
      } catch (err) {
        console.error(`Failed to parse URL template "${url}"`)
        return url
      }
    },
  },
}
</script>
