<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-breadcrumbs
    :items="breadcrumbItems"
    active-color="primary"
    active-class="text-decoration-none"
    exact
  >
    <template #divider>
      <v-icon icon="mdi-chevron-right" size="large"/>
    </template>
    <template #title="{ item }">
      <span v-if="item.to">
        {{ item.title }}
      </span>
      <span v-else
        class="text-h6"
      >
        {{ item.title }}
      </span>
    </template>
  </v-breadcrumbs>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const breadcrumbItems = computed(() => {
  const breadcrumbs = route.meta?.breadcrumbs ?? []
  const items = typeof breadcrumbs === 'function'
    ? breadcrumbs(route)
    : breadcrumbs
  return items
})
</script>

<style lang="scss" scoped>
  :deep(.v-breadcrumbs-item--disabled) {
    opacity: 1 !important;
  }
</style>
