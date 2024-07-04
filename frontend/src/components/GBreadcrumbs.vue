<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-app-bar
      density="compact"
      elevation="0"
      extension-height="1"
    >
      <v-breadcrumbs
        :items="breadcrumbItems"
        active-color="primary"
        active-class="text-decoration-none"
        class="ml-4"
      >
        <template #title="{ item }">
          <span class="text-body-2">
            {{ item.title || item }}
          </span>
        </template>
      </v-breadcrumbs>

      <template #append>
        <v-tooltip
          location="bottom"
        >
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              size="small"
              flat
              icon="mdi-dots-vertical"
              :to="{ name: 'Settings' }"
              class="mr-1"
            />
          </template>
          Settings
        </v-tooltip>
      </template>
      <template #extension>
        <v-divider />
      </template>
    </v-app-bar>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { useProjectStore } from '@/store/project'

import { kebabCase } from '@/lodash'

const projectStore = useProjectStore()
const route = useRoute()

const breadcrumbItems = computed(() => {
  switch (route.name) {
    case 'ProjectList':
      return [{
        key: 'projects',
        title: 'projects',
        disabled: false,
        exact: true,
        to: { name: 'ProjectList' },
      }]
    case 'Secrets':
      return [{
        title: 'projects',
        to: { name: 'ProjectList' },
      }, {
        title: projectStore.projectName,
        disabled: false,
        exact: true,
        to: { name: 'Administration', params: route.params },
      }, {
        title: 'secrets',
        disabled: false,
        exact: true,
        to: { name: 'Secrets', params: route.params },
      }]
    case 'Administration':
    case 'ShootList':
      return [{
        title: 'projects',
        to: { name: 'ProjectList' },
      }, {
        title: projectStore.projectName,
        disabled: false,
        exact: true,
        to: { name: 'Administration', params: route.params },
      }, {
        title: 'clusters',
        disabled: false,
        exact: true,
        to: { name: 'ShootList', params: route.params },
      }]
    case 'ShootItem':
    case 'ShootItemEditor':
      return [{
        key: 'projects',
        title: 'projects',
        to: { name: 'ProjectList' },
      }, {
        title: projectStore.projectName,
        exact: true,
        to: { name: 'Administration', params: route.params },
      },
      {
        key: 'clusters',
        title: 'clusters',
        to: { name: 'ShootList', params: route.params },
      },
      {
        key: 'cluster',
        title: route.params.name,
        disabled: false,
        exact: true,
        to: { name: 'ShootItem', params: route.params },
      }, {
        key: 'cluster-editor',
        title: 'yaml',
        disabled: false,
        exact: true,
        to: { name: 'ShootItemEditor', params: route.params },
      }]
    case 'Settings':
      return [
        {
          key: 'projects',
          title: 'Home',
          disabled: false,
          to: { name: 'ProjectList' },
        },
        {
          key: 'Settings',
          title: 'Settings',
          disabled: false,
          to: { name: 'Settings' },
        },
      ]
    default:
      return defaultBreadcrumbItems.value
  }
})

const defaultBreadcrumbItems = computed(() => {
  const breadcrumbs = route.meta?.breadcrumbs ?? []
  const items = typeof breadcrumbs === 'function'
    ? breadcrumbs(route)
    : breadcrumbs
  return items.map(({ title, href, to, disabled, exact }) => {
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
    return item
  })
})
</script>
