<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-chip
    v-for="({ displayName, notEditable, tooltip }, index) in props.roleDisplayNames"
    :key="displayName"
    :disabled="notEditable"
    size="small"
    color="action-button"
    variant="tonal"
    :class="{ 'ml-3': index > 0 }"
  >
    {{ displayName }}
    <v-tooltip
      activator="parent"
      location="top"
      :disabled="!tooltip"
    >
      {{ tooltip }}
    </v-tooltip>
  </v-chip>
</template>

<script setup>
const props = defineProps({
  roleDisplayNames: {
    type: Array,
    required: true,
  },
})
</script>
