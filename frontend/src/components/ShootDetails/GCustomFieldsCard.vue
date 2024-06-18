<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card
    v-if="customFieldValues && customFieldValues.length"
    class="mb-4"
  >
    <g-toolbar title="Custom Fields" />
    <g-list>
      <template
        v-for="(field, index) in customFieldValues"
        :key="field.key"
      >
        <v-divider
          v-if="index !== 0"
          :key="`${field.key}-divider`"
          inset
        />
        <g-list-item>
          <template #prepend>
            <v-icon
              v-if="field.icon"
              color="primary"
            >
              {{ field.icon }}
            </v-icon>
          </template>
          <g-list-item-content :label="field.name">
            <v-tooltip
              v-if="field.tooltip"
              location="top"
            >
              <template #activator="{ props }">
                <span
                  v-bind="props"
                  :class="classForValue(field.value)"
                >{{ field.displayValue }}</span>
              </template>
              {{ field.tooltip }}
            </v-tooltip>
            <span
              v-else-if="field.displayValue"
              :class="classForValue(field.value)"
            >
              {{ field.displayValue }}
            </span>
          </g-list-item-content>
        </g-list-item>
      </template>
    </g-list>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

import { useShootItem } from '@/composables/useShootItem'
import { useProjectShootCustomFields } from '@/composables/useProjectShootCustomFields'
import { useProjectItem } from '@/composables/useProjectItem'
import { formatValue } from '@/composables/useProjectShootCustomFields/helper'

import {
  filter,
  get,
  map,
} from '@/lodash'

const { projectItem } = useProjectItem()

const {
  shootCustomFields,
} = useProjectShootCustomFields(projectItem)

const {
  shootItem,
} = useShootItem()

const customFieldValues = computed(() => {
  const customFields = filter(shootCustomFields.value, ['showDetails', true])
  return map(customFields, ({ name, path, icon, tooltip, defaultValue }) => {
    const value = get(shootItem.value, path)
    const displayValue = formatValue(value, ', ') || defaultValue || 'Not defined'

    return {
      name,
      path,
      icon,
      tooltip,
      defaultValue,
      value,
      displayValue,
    }
  })
})

function classForValue (value) {
  return {
    'text-grey': !value,
  }
}
</script>
