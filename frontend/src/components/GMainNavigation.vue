<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

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
        :selected-project="selectedProject"
        @project-select="onSelectProject"
        @open-project-dialog="projectDialog = true"
      />
    </template>

    <v-list variant="flat">
      <v-list-item
        v-if="hasNoProjects"
        exact
        :to="{ name: 'Home' }"
        class="bg-main-background"
      >
        <template #append>
          <v-icon
            size="x-small"
            color="main-navigation-title"
            icon="mdi-home-outline"
          />
        </template>
        <template #title>
          <div class="text-body-large text-main-navigation-title">
            Home
          </div>
        </template>
      </v-list-item>
      <template v-if="selectedProject">
        <v-list-item
          v-for="item in visibleProjectItems"
          :key="item.name"
          :to="item.to"
          :exact="item.exact"
          class="bg-main-background"
        >
          <template #prepend>
            <v-icon
              size="x-small"
              color="main-navigation-title"
              :icon="item.icon"
            />
          </template>
          <v-list-item-title class="text-uppercase text-main-navigation-title">
            {{ item.title }}
          </v-list-item-title>
        </v-list-item>
        <v-divider
          v-if="visibleGlobalItems.length"
          class="my-2"
        />
        <v-list-item
          v-for="item in visibleGlobalItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="bg-main-background"
        >
          <template #prepend>
            <v-icon
              size="x-small"
              color="main-navigation-title"
              :icon="item.icon"
            />
          </template>
          <v-list-item-title class="text-uppercase text-main-navigation-title">
            {{ item.title }}
          </v-list-item-title>
        </v-list-item>
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
import { useAuthnStore } from '@/store/authn'
import { useAuthzStore } from '@/store/authz'
import { useProjectStore } from '@/store/project'

import GMainProjectSelection from '@/components/GMainProjectSelection.vue'
import GProjectDialog from '@/components/dialogs/GProjectDialog.vue'
import GTeaser from '@/components/GTeaser.vue'

import { isProjectPending } from '@/composables/useProjectItem'

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
const authnStore = useAuthnStore()
const authzStore = useAuthzStore()
const appStore = useAppStore()
const router = useRouter()
const currentRoute = useRoute()
const { mdAndDown } = useDisplay()

const projectDialog = ref(false)

const projectList = toRef(projectStore, 'projectList')
const sidebar = toRef(appStore, 'sidebar')

const selectedProject = computed(() => {
  if (currentRoute.name === 'AllClusters') {
    return allProjectsItem
  }
  if (currentRoute.meta.projectScoped) {
    return projectStore.projectByName(currentRoute.params.projectName)
  }
  return projectStore.lastProject
})

const projectItems = computed(() => {
  const project = selectedProject.value
  if (!project) {
    return []
  }
  if (project === allProjectsItem) {
    return [
      {
        name: 'AllClusters',
        title: 'Clusters',
        icon: 'mdi-hexagon-multiple',
        to: { name: 'AllClusters' },
      },
    ]
  }
  const namespace = project.spec.namespace
  return [
    {
      name: 'ShootList',
      title: 'Clusters',
      icon: 'mdi-hexagon-multiple',
    },
    {
      name: 'Credentials',
      title: 'Credentials',
      icon: 'mdi-key',
      hidden: !authzStore.canGetCloudProviderCredentialsForNamespace(namespace),
    },
    {
      name: 'Members',
      title: 'Members',
      icon: 'mdi-account-multiple-outline',
    },
    {
      name: 'Administration',
      title: 'Administration',
      icon: 'mdi-cog',
      exact: true,
    },
    {
      name: 'GardenTerminal',
      title: 'Garden Cluster',
      icon: 'mdi-console',
      hidden: !(authzStore.hasGardenTerminalAccessForNamespace(namespace) && authnStore.isAdmin),
    },
  ].map(item => ({
    ...item,
    to: projectMenuRoute(item.name, project),
  }))
})

const visibleProjectItems = computed(() => projectItems.value.filter(item => !item.hidden))

const globalItems = computed(() => [
  {
    name: 'SeedList',
    title: 'Seeds',
    icon: 'mdi-sprout',
    hidden: !authzStore.canViewLandscape,
  },
])

const visibleGlobalItems = computed(() => globalItems.value.filter(item => !item.hidden))

const hasNoProjects = computed(() => {
  return !projectList.value.some(project => !isProjectPending(project))
})

function projectMenuRoute (name, project) {
  return {
    name,
    params: { projectName: project.metadata.name },
  }
}

function projectSwitchTarget (project) {
  if (project.spec.namespace === allProjectsItem.spec.namespace) {
    return { name: 'AllClusters' }
  }
  if (currentRoute.name === 'ShootList') {
    const route = router.resolve(router.options.history.location)
    const query = Object.hasOwn(route.query, 'q')
      ? { q: route.query.q }
      : undefined
    return {
      ...projectMenuRoute('ShootList', project),
      query,
    }
  }
  if (['Credentials', 'Members', 'Administration'].includes(currentRoute.name)) {
    return projectMenuRoute(currentRoute.name, project)
  }
  return projectMenuRoute('ShootList', project)
}

let projectSelectionId = 0

async function onSelectProject (project) {
  if (!project) {
    return
  }
  const selectionId = ++projectSelectionId

  let target = projectSwitchTarget(project)
  if (target.name === 'Credentials') {
    const namespace = project.spec.namespace
    await authzStore.prepareRules(namespace)
    if (selectionId !== projectSelectionId) {
      return
    }
    if (!authzStore.canGetCloudProviderCredentialsForNamespace(namespace)) {
      target = projectMenuRoute('ShootList', project)
    }
  }

  router.push(target)
}

onMounted(() => {
  if (mdAndDown.value) {
    sidebar.value = false
  }
})

</script>
