<!--
SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-autocomplete
    v-model="model"
    :items="items"
    :label="label"
    variant="underlined"
    :clearable="!!model"
    :error-messages="errorMessages"
    :hint="hint"
    persistent-hint
    :custom-filter="filter"
  >
    <template #prepend-inner>
      <v-icon
        v-if="model"
        color="primary"
      >
        {{ model }}
      </v-icon>
    </template>
    <template #item="{ props: itemProps, item }">
      <v-list-item v-bind="itemProps">
        <template #prepend>
          <v-icon>{{ item.raw }}</v-icon>
        </template>
      </v-list-item>
    </template>
  </v-autocomplete>
</template>

<script setup>
import {
  computed,
  ref,
} from 'vue'

import {
  mdiIcons,
  mdiAliasMap,
} from '@/utils/mdiIcons'

const items = ref(mdiIcons)
const aliasMap = mdiAliasMap

function filter (value, query) {
  const q = String(query ?? '').toLowerCase()
  const text = String(value ?? '').toLowerCase()
  if (text.includes(q)) {
    return true
  }

  const list = aliasMap.get(text) || []
  return list.some(alias => alias.includes(q))
}

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: 'Icon',
  },
  errorMessages: {
    type: [String, Array],
    default: undefined,
  },
  hint: {
    type: String,
    default: undefined,
  },
})

const emit = defineEmits(['update:modelValue'])

const model = computed({
  get () {
    return props.modelValue
  },
  set (value) {
    emit('update:modelValue', value)
  },
})
</script>
