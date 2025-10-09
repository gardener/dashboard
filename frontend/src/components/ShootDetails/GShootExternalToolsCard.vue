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

<script setup>
import {
  computed,
  inject,
} from 'vue'
import { parseTemplate } from 'url-template'

import { useConfigStore } from '@/store/config'

import GExternalLink from '@/components/GExternalLink'

import { useShootItem } from '@/composables/useShootItem'

const logger = inject('logger')

const configStore = useConfigStore()

const {
  shootName,
  shootNamespace,
  shootProjectName,
  shootDomain,
} = useShootItem()

const items = computed(() => {
  return configStore.externalTools ?? []
})

const urlData = computed(() => {
  return {
    name: shootName.value,
    namespace: shootNamespace.value,
    domain: shootDomain.value,
    project: shootProjectName.value,
  }
})

function expandUrl (url) {
  try {
    return parseTemplate(url).expand(urlData.value)
  } catch (err) {
    logger.error(`Failed to parse URL template "${url}"`)
    return url
  }
}
</script>
