<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container
    fluid
    class="pa-6"
  >
    <v-row class="d-flex">
      <v-col
        cols="12"
        md="6"
      >
        <g-shoot-details-card />
        <g-custom-fields-card
          :custom-fields="customFields"
        />
        <g-shoot-infrastructure-card />
        <g-shoot-external-tools-card />
        <g-shoot-lifecycle-card
          ref="shootLifecycleCard"
        />
      </v-col>
      <v-col
        cols="12"
        md="6"
      >
        <v-card class="mb-4">
          <g-toolbar title="Access" />
          <g-shoot-access-card
            @add-terminal-shortcut="onAddTerminalShortcut"
          />
        </v-card>
        <g-shoot-monitoring-card />
        <g-shoot-credential-rotation-card />
        <g-tickets-card />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
  defineAsyncComponent,
} from 'vue'
import { useRoute } from 'vue-router'

import { useProjectStore } from '@/store/project'

import GShootDetailsCard from '@/components/ShootDetails/GShootDetailsCard'
import GCustomFieldsCard from '@/components/ShootDetails/GCustomFieldsCard'
import GShootExternalToolsCard from '@/components/ShootDetails/GShootExternalToolsCard'
import GShootInfrastructureCard from '@/components/ShootDetails/GShootInfrastructureCard'
import GShootLifecycleCard from '@/components/ShootDetails/GShootLifecycleCard'
import GShootMonitoringCard from '@/components/ShootDetails/GShootMonitoringCard'
import GShootCredentialRotationCard from '@/components/ShootDetails/GShootCredentialRotationCard'
import GTicketsCard from '@/components/GTicketsCard'

import { useShootItem } from '@/composables/useShootItem'

import {
  filter,
  get,
  map,
} from '@/lodash'

const GShootAccessCard = defineAsyncComponent(() => import('@/components/ShootDetails/GShootAccessCard'))

const route = useRoute()

const shootLifecycleCard = ref()

const {
  shootItem,
} = useShootItem()

const projectStore = useProjectStore()

const customFields = computed(() => {
  const customFields = filter(projectStore.shootCustomFieldList, ['showDetails', true])
  return map(customFields, ({ name, path, icon, tooltip, defaultValue }) => ({
    name,
    path,
    icon,
    tooltip,
    defaultValue,
    value: get(shootItem.value, path),
  }))
})

const emit = defineEmits([
  'addTerminalShortcut',
])

function onAddTerminalShortcut (shortcut) {
  emit('addTerminalShortcut', shortcut)
}

onMounted(() => {
  if (get(route, 'name') === 'ShootItemHibernationSettings') {
    shootLifecycleCard.value?.showHibernationConfigurationDialog()
  }
})
</script>

<style lang="scss" scoped>
  .subheading.v-card__title {
    line-height: 10px;
  }
</style>
