<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-navigation-drawer
    v-model="sidebar"
    :mobile-breakpoint="400"
    color="main-background"
    class="overflow-hidden"
  >
    <g-teaser>
      <div style="position: absolute; top: 0; right: 0; z-index: 1;">
        <v-btn
          icon="mdi-chevron-double-left"
          variant="text"
          class="ma-2 text-main-navigation-title"
          @click.stop="sidebar = false"
        />
      </div>
    </g-teaser>
    <template v-if="projectList.length">
      <g-main-project-selection
        v-model="selectedProject"
        @project-select="onSelectProject"
        @open-project-dialog="projectDialog = true"
      />
    </template>

    <v-list
      ref="refMainMenu"
      variant="flat"
      class="main-menu"
    >
      <v-list-item
        v-if="hasNoProjects"
        exact
        :to="{ name: 'Home' }"
        class="bg-main-background"
        active-class="active-item"
      >
        <template #append>
          <v-icon
            size="x-small"
            color="main-navigation-title"
            icon="mdi-home-outline"
          />
        </template>
        <template #title>
          <div class="text-subtitle-1 text-main-navigation-title">
            Home
          </div>
        </template>
      </v-list-item>
      <template v-if="namespace">
        <template
          v-for="route in visibleRoutes"
          :key="`${namespace}-${route.path}`"
        >
          <v-list-item
            :to="namespacedRoute(route)"
            class="bg-main-background"
            active-class="active-item"
          >
            <template #prepend>
              <v-icon
                size="x-small"
                color="main-navigation-title"
                :icon="route.meta.menu.icon"
              />
            </template>
            <v-list-item-title class="text-uppercase text-main-navigation-title">
              {{ route.meta.menu.title }}
            </v-list-item-title>
          </v-list-item>
        </template>
      </template>
    </v-list>

    <g-project-dialog v-model="projectDialog" />
  </v-navigation-drawer>
</template>

<script setup>
import {
  ref,
  computed,
  toRef,
  onMounted,
} from 'vue'
import {
  useRouter,
  useRoute,
} from 'vue-router'
import { useDisplay } from 'vuetify'

import { useAppStore } from '@/store/app'
import { useProjectStore } from '@/store/project'

import GMainProjectSelection from '@/components/GMainProjectSelection.vue'
import GProjectDialog from '@/components/dialogs/GProjectDialog.vue'
import GTeaser from '@/components/GTeaser.vue'

import {
  routes as getRoutes,
  namespacedRoute as getNamespacedRoute,
  routeName as getRouteName,
} from '@/utils'

import get from 'lodash/get'
import has from 'lodash/has'

const allProjectsItem = {
  metadata: {
    name: 'All Projects',
  },
  spec: {
    namespace: '_all',
  },
  status: {
    phase: 'Ready',
  },
}

const projectStore = useProjectStore()
const appStore = useAppStore()
const router = useRouter()
const currentRoute = useRoute()
const { mdAndDown } = useDisplay()

const projectDialog = ref(false)
const refMainMenu = ref(null)

const namespace = toRef(projectStore, 'namespace')
const projectList = toRef(projectStore, 'projectList')
const sidebar = toRef(appStore, 'sidebar')

const selectedProject = ref()

const visibleRoutes = computed(() => {
  if (!selectedProject.value) {
    return []
  }
  return routes.value.filter(route => {
    return !route.meta.menu.hidden
  })
})

const hasNoProjects = computed(() => {
  return !projectList.value.length
})

const routes = computed(() => {
  const hasProjectScope = get(selectedProject.value, ['spec', 'namespace']) !== allProjectsItem.spec.namespace
  return getRoutes(router, hasProjectScope)
})

function namespacedRoute (route) {
  return getNamespacedRoute(route, namespace.value)
}

function getProjectMenuTargetRoute (namespace) {
  const fallbackToShootList = route => {
    if (namespace === '_all' && get(route, ['meta', 'projectScope']) !== false) {
      return true
    }
    if (has(route, ['params', 'name'])) {
      return true
    }
    if (get(route, ['name']) === 'NewShoot' || get(route, ['name']) === 'NewShootEditor') {
      return true
    }
    if (get(route, ['name']) === 'GardenTerminal') {
      return true
    }
    return false
  }
  if (fallbackToShootList(currentRoute)) {
    return {
      name: 'ShootList',
      params: {
        namespace,
      },
    }
  }
  const name = getRouteName(currentRoute)
  const key = get(currentRoute, ['meta', 'namespaced']) === false
    ? 'query'
    : 'params'
  return {
    name,
    [key]: {
      namespace,
    },
  }
}

function onSelectProject (project) {
  const namespace = project?.spec?.namespace
  if (!namespace) {
    return
  }
  const target = getProjectMenuTargetRoute(namespace)

  const current = router.resolve(currentRoute)
  const next = router.resolve(target)

  if (current.fullPath === next.fullPath) {
    return
  }
  router.push(target)
}

onMounted(() => {
  if (mdAndDown.value) {
    sidebar.value = false
  }
})

</script>

<style lang="scss" scoped>
.main-menu {
  .active-item {
    background-color: rgba(#fff, .3);
  }
}
</style>
