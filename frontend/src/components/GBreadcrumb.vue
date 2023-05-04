<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <v-breadcrumbs :items="breadcrumbItems">
    <template v-slot:divider>
      <v-icon icon="mdi-chevron-right" size="large"/>
    </template>
    <template v-slot:title="{ item }">
      <router-link v-if="item.to" :to="item.to" class="text-decoration-none">
        {{ item.text }}
      </router-link>
      <span v-else class="text-h6">
        {{ item.text }}
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
  if (typeof breadcrumbs === 'function') {
    return breadcrumbs(route)
  }
  return breadcrumbs
})
</script>
