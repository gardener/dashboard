<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card
    v-if="items.length"
    class="mb-4"
  >
    <g-toolbar title="External Tools" />
    <g-list>
      <template
        v-for="({ title, url, icon }, index) in items"
        :key="title"
      >
        <v-divider
          v-if="index"
          :key="index"
          inset
          class="my-2"
        />
        <g-list-item>
          <template #prepend>
            <v-icon color="primary">
              {{ icon || 'link' }}
            </v-icon>
          </template>
          <g-list-item-content :label="title">
            <g-external-link :url="expandUrl(url)">
              {{ expandUrl(url) }}
            </g-external-link>
          </g-list-item-content>
        </g-list-item>
      </template>
    </g-list>
  </v-card>
</template>

<script>
import { parseTemplate } from 'url-template'
import { mapState } from 'pinia'

import { useConfigStore } from '@/store/config'

import GExternalLink from '@/components/GExternalLink'

import { useShootItem } from '@/composables/useShootItem'

import { get } from '@/lodash'

export default {
  components: {
    GExternalLink,
  },
  inject: ['logger'],
  setup () {
    return {
      ...useShootItem(),
    }
  },
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
        this.logger.error(`Failed to parse URL template "${url}"`)
        return url
      }
    },
  },
}
</script>
