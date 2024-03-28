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
      <v-icon
        icon="mdi-chevron-right"
        size="large"
      />
    </template>
    <template #title="{ item }">
      <span :class="{ 'text-h6': item.last }">
        {{ item.title || item }}
      </span>
    </template>
  </v-breadcrumbs>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { useProjectStore } from '@/store/project'

import { kebabCase } from '@/lodash'

const route = useRoute()
const projectStore = useProjectStore()

const breadcrumbItems = computed(() => {
  const breadcrumbs = route.meta?.breadcrumbs ?? []
  const items = typeof breadcrumbs === 'function'
    ? breadcrumbs(route, projectStore.projectName)
    : breadcrumbs
  return items.map(({ title, href, to, disabled, exact }, index, array) => {
    const item = {
      key: kebabCase(title),
      title,
    }
    if (to) {
      item.to = to
    } else if (href) {
      item.href = href
    } else {
      item.key += '--disabled'
      item.disabled = true
    }
    if (typeof disabled === 'boolean') {
      item.disabled = disabled
    }
    if (typeof exact === 'boolean') {
      item.exact = exact
    }
    if (index === array.length - 1) {
      item.last = true
    }
    return item
  })
})
</script>

<style lang="scss" scoped>
  :deep(.v-breadcrumbs-item--disabled) {
    opacity: 1 !important;
  }
</style>
