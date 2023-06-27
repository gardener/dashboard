<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card v-if="customFields && customFields.length">
    <g-toolbar title="Custom Fields" />
    <g-list>
      <template v-for="(customField, index) in customFields" :key="customField.key">
        <v-divider v-if="index !== 0" inset :key="`${customField.key}-divider`"></v-divider>
        <g-list-item>
          <template #prepend>
            <v-icon color="primary" v-if="customField.icon">{{customField.icon}}</v-icon>
          </template>
          <g-list-item-content :label="customField.name">
            <v-tooltip top v-if="customField.tooltip">
              <template v-slot:activator="{ on }">
                <span v-on="on">{{customField.value}}</span>
              </template>
              {{customField.tooltip}}
            </v-tooltip>
            <span v-else>{{customField.value}}</span>
          </g-list-item-content>
        </g-list-item>
      </template>
    </g-list>
  </v-card>
</template>

<script>

export default {
  name: 'custom-fields-card',
  props: {
    customFields: {
      type: Array,
    },
  },
}
</script>
