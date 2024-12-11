<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container fluid>
    <v-card class="ma-3">
      <g-toolbar
        :height="48"
        :title="`Projects`"
      >
        <template #title>
          Project List
        </template>
        <template #append>
          <v-tooltip
            location="top"
          >
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                :disabled="!canCreateProject"
                icon="mdi-plus"
                color="toolbar-title"
                @click.stop="projectDialog = true"
              />
            </template>
            <span>Create Project</span>
          </v-tooltip>
        </template>
      </g-toolbar>

      <v-table>
        <thead>
          <tr>
            <th
              class="text-left"
            >
              Name
            </th>
            <th
              class="text-left"
            >
              Clusters
            </th>
            <th
              class="text-left"
            >
              Owner
            </th>
            <th class="text-left">
              Created At
            </th>
            <th class="text-left">
              Description
            </th>
            <th>
              Purpose
            </th>
            <th class="text-left">
              Phase
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!projectList.length">
            <td
              colspan="6"
              class="text-center"
            >
              No projects available
            </td>
          </tr>
          <tr
            v-for="item in projectList"
            v-else
            :key="item.metadata.name"
          >
            <td>
              <g-text-router-link
                :to="{ name: 'Administration', params: { namespace: item.spec.namespace } }"
                :text="item.metadata.name"
              />
            </td>
            <td class="text-left">
              <v-chip
                size="small"
                color="primary"
                variant="outlined"
                label
                :to="{ name: 'ShootList', params: { namespace: item.spec.namespace } }"
              >
                {{ getNumberOfShoots(item) }}
              </v-chip>
            </td>
            <td>
              <g-account-avatar :account-name="item.spec.owner.name" />
            </td>
            <td>
              <g-time-string
                :date-time="item.metadata.creationTimestamp"
                mode="past"
              />
            </td>
            <td>
              {{ item.spec.description ?? '-' }}
            </td>
            <td>
              {{ item.spec.purpose ?? '-' }}
            </td>
            <td>
              <v-chip
                color="primary"
              >
                {{ item.status.phase ?? '-' }}
              </v-chip>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
    <g-project-dialog v-model="projectDialog" />
  </v-container>
</template>

<script setup>
import {
  ref,
  computed,
  toRef,
} from 'vue'

import { useAuthzStore } from '@/store/authz'
import { useProjectStore } from '@/store/project'

import GProjectDialog from '@/components/dialogs/GProjectDialog.vue'
import GTextRouterLink from '@/components/GTextRouterLink.vue'
import GAccountAvatar from '@/components/GAccountAvatar.vue'

import { useOpenMFP } from '@/composables/useOpenMFP'

import get from 'lodash/get'
import filter from 'lodash/filter'

const projectStore = useProjectStore()
const authzStore = useAuthzStore()
const openMFP = useOpenMFP()

const canCreateProject = toRef(authzStore, 'canCreateProject')

const projectDialog = ref(false)

const projectList = computed(() => {
  const belongsToAccount = project => openMFP.accountId.value === get(project, ['metadata', 'annotations', 'openmfp.org/account-id'])
  return !openMFP.accountId.value
    ? projectStore.projectList
    : filter(projectStore.projectList, belongsToAccount)
})

function getNumberOfShoots (project) {
  return get(project, ['metadata', 'annotations', 'computed.gardener.cloud/number-of-shoots'], 0)
}
</script>
