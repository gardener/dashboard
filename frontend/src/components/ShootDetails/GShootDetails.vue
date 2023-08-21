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
        <g-shoot-details-card :shoot-item="shootItem" />
        <g-custom-fields-card :custom-fields="customFields" />
        <g-shoot-infrastructure-card :shoot-item="shootItem" />
        <g-shoot-external-tools-card :shoot-item="shootItem" />
        <g-shoot-lifecycle-card
          ref="shootLifecycle"
          :shoot-item="shootItem"
        />
      </v-col>
      <v-col
        cols="12"
        md="6"
      >
        <v-card
          v-if="canGetSecrets"
          class="mb-4"
        >
          <g-toolbar title="Access" />
          <g-shoot-access-card
            :shoot-item="shootItem"
            @add-terminal-shortcut="onAddTerminalShortcut"
          />
        </v-card>
        <g-shoot-monitoring-card :shoot-item="shootItem" />
        <g-shoot-credential-rotation-card :shoot-item="shootItem" />
        <g-tickets-card :shoot-item="shootItem" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import { mapState } from 'pinia'

import { useAuthzStore } from '@/store/authz'
import { useProjectStore } from '@/store/project'

import GShootDetailsCard from '@/components/ShootDetails/GShootDetailsCard'
import GCustomFieldsCard from '@/components/ShootDetails/GCustomFieldsCard'
import GShootExternalToolsCard from '@/components/ShootDetails/GShootExternalToolsCard'
import GShootInfrastructureCard from '@/components/ShootDetails/GShootInfrastructureCard'
import GShootLifecycleCard from '@/components/ShootDetails/GShootLifecycleCard'
import GShootMonitoringCard from '@/components/ShootDetails/GShootMonitoringCard'
import GShootCredentialRotationCard from '@/components/ShootDetails/GShootCredentialRotationCard'
import GTicketsCard from '@/components/GTicketsCard'

import { shootItem } from '@/mixins/shootItem'

import {
  filter,
  get,
  map,
} from '@/lodash'

export default {
  name: 'ShootDetails',
  components: {
    GShootDetailsCard,
    GCustomFieldsCard,
    GShootInfrastructureCard,
    GShootLifecycleCard,
    GShootAccessCard: defineAsyncComponent(() => import('@/components/ShootDetails/GShootAccessCard')),
    GTicketsCard,
    GShootMonitoringCard,
    GShootCredentialRotationCard,
    GShootExternalToolsCard,
  },
  mixins: [shootItem],
  emits: [
    'addTerminalShortcut',
  ],
  computed: {
    ...mapState(useAuthzStore, ['canGetSecrets']),
    ...mapState(useProjectStore, ['shootCustomFieldList']),
    customFields () {
      const customFields = filter(this.shootCustomFieldList, ['showDetails', true])
      return map(customFields, ({ name, path, icon, tooltip, defaultValue }) => ({
        name,
        path,
        icon,
        tooltip,
        defaultValue,
        value: get(this.shootItem, path),
      }))
    },
  },
  mounted () {
    if (get(this.$route, 'name') === 'ShootItemHibernationSettings') {
      this.$refs.shootLifecycle.showHibernationConfigurationDialog()
    }
  },
  methods: {
    onAddTerminalShortcut (shortcut) {
      this.$emit('addTerminalShortcut', shortcut)
    },
  },
}
</script>

<style lang="scss" scoped>
  .subheading.v-card__title {
    line-height: 10px;
  }
</style>
