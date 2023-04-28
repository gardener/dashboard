<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popper
    :title="name"
    :toolbar-color="color"
    :popper-key="`worker_group_${name}`"
    placement="right"
  >
    <template v-slot:popperRef>
      <v-chip
        small
        class="cursor-pointer my-0 ml-0"
        variant="outlined"
        :color="color">
        <v-icon v-if="icon" size="small" class="pr-1">{{icon}}</v-icon>{{name}}
      </v-chip>
    </template>
    <v-list class="pa-0">
      <v-list-item class="px-0">
        <v-list-item-content class="pt-1">
          <v-list-item-subtitle>Icon</v-list-item-subtitle>
          <v-list-item-title>
            <template v-if="icon">
              <v-icon class="pr-1">{{icon}}</v-icon>
            </template>
            <span v-else class="font-weight-light text--disabled">Not defined</span>
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item class="px-0">
        <v-list-item-content class="pt-1">
          <v-list-item-subtitle>Name</v-list-item-subtitle>
          <v-list-item-title>{{name}}</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item class="px-0">
        <v-list-item-content class="pt-1">
          <v-list-item-subtitle>Tooltip</v-list-item-subtitle>
          <v-list-item-title>
            <template v-if="tooltip">
              {{tooltip}}
            </template>
            <span v-else class="font-weight-light text--disabled">Not defined</span>
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item class="px-0">
        <v-list-item-content class="pt-1">
          <v-list-item-subtitle>Path</v-list-item-subtitle>
          <v-list-item-title>{{path}}</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item class="px-0">
        <v-list-item-content class="pt-1">
          <v-list-item-subtitle>Default Value</v-list-item-subtitle>
          <v-list-item-title>
            <template v-if="defaultValue">
              {{defaultValue}}
            </template>
            <span v-else class="font-weight-light text--disabled">Not defined</span>
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-divider></v-divider>
      <v-subheader class="px-0">Cluster List Settings</v-subheader>
      <v-list-item class="px-0">
        <v-list-item-content class="pt-1">
          <v-list-item-subtitle>Property Visible</v-list-item-subtitle>
          <v-list-item-title>
              {{showColumn ? 'Yes' : 'No'}}
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item class="px-0" v-if="showColumn">
        <v-list-item-content class="pt-1">
          <v-list-item-subtitle>Property Visible by Default</v-list-item-subtitle>
          <v-list-item-title>
              {{columnSelectedByDefault ? 'Yes' : 'No'}}
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item class="px-0" v-if="showColumn">
        <v-list-item-content class="pt-1">
          <v-list-item-subtitle>Weight</v-list-item-subtitle>
          <v-list-item-title>
            <template v-if="weight">
              {{weight}}
            </template>
            <span v-else class="font-weight-light text--disabled">Not defined</span>
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item class="px-0">
        <v-list-item-content class="pt-1">
          <v-list-item-subtitle>Searchable</v-list-item-subtitle>
          <v-list-item-title>
              {{searchable ? 'Yes' : 'No'}}
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item class="px-0" v-if="showColumn">
        <v-list-item-content class="pt-1">
          <v-list-item-subtitle>Sortable</v-list-item-subtitle>
          <v-list-item-title>
              {{searchable ? 'Yes' : 'No'}}
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-divider></v-divider>
      <v-subheader class="px-0">Cluster Details Settings</v-subheader>
      <v-list-item class="px-0">
        <v-list-item-content class="pt-1">
          <v-list-item-subtitle>Property Visible</v-list-item-subtitle>
          <v-list-item-title>
              {{showDetails ? 'Yes' : 'No'}}
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </g-popper>
</template>

<script>

import GPopper from '@/components/GPopper.vue'

export default {
  components: {
    GPopper
  },
  props: {
    color: {
      type: String
    },
    name: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    icon: {
      type: String
    },
    tooltip: {
      type: String
    },
    defaultValue: {
      type: String
    },
    showColumn: {
      type: Boolean
    },
    weight: {
      type: Number
    },
    columnSelectedByDefault: {
      type: Boolean
    },
    searchable: {
      type: Boolean
    },
    sortable: {
      type: Boolean
    },
    showDetails: {
      type: Boolean
    }
  }
}
</script>

<style lang="scss" scoped>

  :deep(.popper) {
    text-align: initial;
  }

</style>
