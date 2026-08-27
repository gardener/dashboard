<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-chip
    v-tooltip:top="'This cluster does not have worker groups'"
    size="small"
    class="ma-1"
    variant="tonal"
    color="disabled"
  >
    workerless
  </v-chip>
</template>

<script setup>
</script>
