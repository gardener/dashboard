<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-chip
    v-for="({ displayName, notEditable, tooltip }, index) in props.roleDisplayNames"
    :key="displayName"
    v-tooltip:top="{
      text: tooltip,
      disabled: !tooltip
    }"
    :disabled="notEditable"
    size="small"
    color="action-button"
    variant="tonal"
    :class="{ 'mx-1': index > 0 }"
    class="my-1"
  >
    {{ displayName }}
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
