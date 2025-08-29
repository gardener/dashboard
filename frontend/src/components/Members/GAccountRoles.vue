<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div class="d-flex ga-1">
    <v-chip
      v-for="({ displayName, shortDisplayName, notEditable, tooltip }) in props.roleDescriptors"
      :key="displayName"
      v-tooltip:top="{
        text: tooltip || (shortDisplayName ? displayName : undefined),
        disabled: !tooltip && !shortDisplayName
      }"
      size="small"
      color="action-button"
      variant="tonal"
      :class="{ 'opacity-30' : notEditable }"
    >
      {{ shortDisplayName || displayName }}
    </v-chip>
  </div>
</template>

<script setup>
const props = defineProps({
  roleDescriptors: {
    type: Array,
    required: true,
  },
})
</script>
