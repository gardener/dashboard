<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popover
    v-model="popover"
    :toolbar-title="name"
    :toolbar-color="color"
    placement="right"
  >
    <template #activator="{ props }">
      <v-chip
        v-bind="props"
        size="small"
        class="cursor-pointer"
        variant="tonal"
        :color="color"
      >
        <template #prepend>
          <v-icon
            v-if="icon && isMdiIcon(icon)"
            size="small"
            class="pr-1"
          >
            {{ icon }}
          </v-icon>
        </template>
        {{ name }}
      </v-chip>
    </template>
    <template #text>
      <v-list class="pa-0">
        <v-list-item>
          <v-list-item-subtitle>Icon</v-list-item-subtitle>
          <v-list-item-title>
            <v-icon
              v-if="icon && isMdiIcon(icon)"
              class="pr-1"
            >
              {{ icon }}
            </v-icon>
            <span
              v-else
              class="font-weight-light text-disabled"
            >Not defined</span>
          </v-list-item-title>
        </v-list-item>
        <v-list-item>
          <v-list-item-subtitle>Name</v-list-item-subtitle>
          <v-list-item-title>{{ name }}</v-list-item-title>
        </v-list-item>
        <v-list-item>
          <v-list-item-subtitle>Tooltip</v-list-item-subtitle>
          <v-list-item-title>
            <template v-if="tooltip">
              {{ tooltip }}
            </template>
            <span
              v-else
              class="font-weight-light text-disabled"
            >Not defined</span>
          </v-list-item-title>
        </v-list-item>
        <v-list-item>
          <v-list-item-subtitle>Path</v-list-item-subtitle>
          <v-list-item-title>{{ path }}</v-list-item-title>
        </v-list-item>
        <v-list-item>
          <v-list-item-subtitle>Default Value</v-list-item-subtitle>
          <v-list-item-title>
            <template v-if="defaultValue">
              {{ defaultValue }}
            </template>
            <span
              v-else
              class="font-weight-light text-disabled"
            >Not defined</span>
          </v-list-item-title>
        </v-list-item>
        <v-divider />
        <v-list-subheader>Cluster List Settings</v-list-subheader>
        <v-list-item>
          <v-list-item-subtitle>Property Visible</v-list-item-subtitle>
          <v-list-item-title>
            {{ showColumn ? 'Yes' : 'No' }}
          </v-list-item-title>
        </v-list-item>
        <v-list-item v-if="showColumn">
          <v-list-item-subtitle>Property Visible by Default</v-list-item-subtitle>
          <v-list-item-title>
            {{ columnSelectedByDefault ? 'Yes' : 'No' }}
          </v-list-item-title>
        </v-list-item>
        <v-list-item v-if="showColumn">
          <v-list-item-subtitle>Weight</v-list-item-subtitle>
          <v-list-item-title>
            <template v-if="weight">
              {{ weight }}
            </template>
            <span
              v-else
              class="font-weight-light text-disabled"
            >Not defined</span>
          </v-list-item-title>
        </v-list-item>
        <v-list-item>
          <v-list-item-subtitle>Searchable</v-list-item-subtitle>
          <v-list-item-title>
            {{ searchable ? 'Yes' : 'No' }}
          </v-list-item-title>
        </v-list-item>
        <v-list-item v-if="showColumn">
          <v-list-item-subtitle>Sortable</v-list-item-subtitle>
          <v-list-item-title>
            {{ searchable ? 'Yes' : 'No' }}
          </v-list-item-title>
        </v-list-item>
        <v-divider />
        <v-list-subheader z>
          Cluster Details Settings
        </v-list-subheader>
        <v-list-item>
          <v-list-item-subtitle>Property Visible</v-list-item-subtitle>
          <v-list-item-title>
            {{ showDetails ? 'Yes' : 'No' }}
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </template>
  </g-popover>
</template>

<script setup>
import { ref } from 'vue'

import { isMdiIcon } from '@/utils/mdiIcons'

defineProps({
  color: {
    type: String,
  },
  name: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
  },
  tooltip: {
    type: String,
  },
  defaultValue: {
    type: String,
  },
  showColumn: {
    type: Boolean,
  },
  weight: {
    type: Number,
  },
  columnSelectedByDefault: {
    type: Boolean,
  },
  searchable: {
    type: Boolean,
  },
  sortable: {
    type: Boolean,
  },
  showDetails: {
    type: Boolean,
  },
})

const popover = ref(false)
</script>
