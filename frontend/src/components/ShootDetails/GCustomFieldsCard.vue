<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card
    v-if="customFields && customFields.length"
    class="mb-4"
  >
    <g-toolbar title="Custom Fields" />
    <g-list>
      <template
        v-for="(customField, index) in customFields"
        :key="customField.key"
      >
        <v-divider
          v-if="index !== 0"
          :key="`${customField.key}-divider`"
          inset
        />
        <g-list-item>
          <template #prepend>
            <v-icon
              v-if="customField.icon"
              color="primary"
            >
              {{ customField.icon }}
            </v-icon>
          </template>
          <g-list-item-content :label="customField.name">
            <v-tooltip
              v-if="customField.tooltip"
              location="top"
            >
              <template #activator="{ props }">
                <span v-bind="props">{{ customField.value }}</span>
              </template>
              {{ customField.tooltip }}
            </v-tooltip>
            <span v-else>{{ customField.value }}</span>
          </g-list-item-content>
        </g-list-item>
      </template>
    </g-list>
  </v-card>
</template>

<script>

export default {
  props: {
    customFields: {
      type: Array,
    },
  },
}
</script>
