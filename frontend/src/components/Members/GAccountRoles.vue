<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div class="d-flex flex-wrap ga-1 justify-end">
    <v-chip
      v-for="({ displayName, notEditable, tooltip }) in props.roleDescriptors"
      :key="displayName"
      v-tooltip:top="{
        text: tooltip,
        disabled: !tooltip
      }"
      size="x-small"
      color="action-button"
      variant="tonal"
      :class="{ 'opacity-30' : notEditable }"
    >
      {{ displayName }}
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
