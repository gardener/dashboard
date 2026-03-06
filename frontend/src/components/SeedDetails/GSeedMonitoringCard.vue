<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card class="mb-4">
    <g-toolbar title="Logging and Monitoring" />
    <g-list>
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">
            mdi-tractor
          </v-icon>
        </template>
        <g-list-item-content label="Status">
          <g-seed-status
            popper-placement="bottom"
            show-status-text
          />
        </g-list-item-content>
      </g-list-item>
      <v-divider inset />
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">
            mdi-speedometer
          </v-icon>
        </template>
        <g-list-item-content label="Readiness">
          <div class="d-flex align-center pt-1">
            <g-seed-status-tags
              :identifier="seedName"
              popper-placement="bottom"
              show-status-text
            />
          </div>
        </g-list-item-content>
      </g-list-item>
      <v-divider inset />
      <g-link-list-tile
        v-if="seedPlutonoUrl"
        icon="mdi-developer-board"
        app-title="Plutono"
        :url="seedPlutonoUrl"
        :url-text="seedPlutonoUrl"
      />
      <g-list-item v-else>
        <template #prepend>
          <v-icon color="primary">
            mdi-alert-circle-outline
          </v-icon>
        </template>
        <g-list-item-content label="Plutono">
          Not available
        </g-list-item-content>
      </g-list-item>
    </g-list>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

import GSeedStatus from '@/components/GSeedStatus.vue'
import GSeedStatusTags from '@/components/GSeedStatusTags.vue'
import GLinkListTile from '@/components/GLinkListTile.vue'

import { useSeedItem } from '@/composables/useSeedItem/index'

import { getSeedPlutonoUrl } from '@/utils'

const {
  seedName,
  seedIngressDomain,
} = useSeedItem()

const seedPlutonoUrl = computed(() => getSeedPlutonoUrl(seedIngressDomain.value))
</script>
