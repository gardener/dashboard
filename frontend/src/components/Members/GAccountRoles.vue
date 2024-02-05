<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-tooltip
    v-for="({ displayName, notEditable, tooltip }, index) in roleDisplayNames"
    :key="displayName"
    location="top"
    :disabled="!tooltip"
  >
    <template #activator="{ props: activatorProps }">
      <v-chip
        v-bind="activatorProps"
        :disabled="notEditable"
        size="small"
        color="action-button"
        variant="tonal"
        :class="{ 'ml-3': index > 0 }"
      >
        {{ displayName }}
      </v-chip>
    </template>
    <span>{{ tooltip }}</span>
  </v-tooltip>
</template>

<script setup>
import { toRefs } from 'vue'

const props = defineProps({
  roleDisplayNames: {
    type: Array,
    required: true,
  },
})

const { roleDisplayNames } = toRefs(props)

</script>
