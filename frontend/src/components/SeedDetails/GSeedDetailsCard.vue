<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card class="mb-4">
    <g-toolbar title="Details" />
    <g-list>
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">
            mdi-information-outline
          </v-icon>
        </template>
        <g-list-item-content label="Name">
          {{ seedName }}
        </g-list-item-content>
        <template #append>
          <g-copy-btn :clipboard-text="seedName" />
        </template>
      </g-list-item>
      <v-divider inset />
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">
            mdi-cube-outline
          </v-icon>
        </template>
        <g-list-item-content label="Kubernetes Version">
          {{ seedKubernetesVersion || '-' }}
        </g-list-item-content>
      </g-list-item>
      <g-list-item>
        <g-list-item-content label="Gardener Version">
          {{ seedGardenerVersion || '-' }}
        </g-list-item-content>
      </g-list-item>
      <v-divider inset />
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">
            mdi-earth
          </v-icon>
        </template>
        <g-list-item-content label="Access Restrictions">
          <div
            v-if="seedAccessRestrictions.length"
            class="d-flex flex-wrap align-center"
          >
            <g-access-restriction-chip
              v-for="item in seedAccessRestrictions"
              :id="item.key"
              :key="item.key"
              :title="item.title"
              :options="item.options"
            />
          </div>
          <span v-else>
            No access restrictions configured
          </span>
        </g-list-item-content>
      </g-list-item>
      <v-divider inset />
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">
            mdi-server
          </v-icon>
        </template>
        <g-list-item-content label="Scheduling">
          <span
            v-if="seedSchedulingVisible"
          >
            Allowed
          </span>
          <v-chip
            v-else
            v-tooltip:top="'This seed is hidden from shoot scheduling'"
            size="small"
            color="warning"
            variant="tonal"
          >
            Hidden
          </v-chip>
        </g-list-item-content>
      </g-list-item>
      <v-divider inset />
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">
            mdi-clock-outline
          </v-icon>
        </template>
        <g-list-item-content label="Created at">
          <g-time-string
            :date-time="seedCreationTimestamp"
            mode="past"
          />
        </g-list-item-content>
      </g-list-item>
    </g-list>
  </v-card>
</template>

<script setup>
import GCopyBtn from '@/components/GCopyBtn'
import GTimeString from '@/components/GTimeString'
import GAccessRestrictionChip from '@/components/ShootAccessRestrictions/GAccessRestrictionChip'

import { useSeedItem } from '@/composables/useSeedItem/index'

const {
  seedName,
  seedKubernetesVersion,
  seedGardenerVersion,
  seedAccessRestrictions,
  seedSchedulingVisible,
  seedCreationTimestamp,
} = useSeedItem()
</script>
