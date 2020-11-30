<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->
<template>
  <v-container fluid>
    <v-row class="d-flex">
      <v-col cols="12" md="6">
        <shoot-details-card :shootItem="shootItem"></shoot-details-card>
        <custom-fields-card :custom-fields="customFields" class="mt-4"></custom-fields-card>
        <shoot-infrastructure-card :shootItem="shootItem" class="mt-4"></shoot-infrastructure-card>
        <shoot-external-tools-card :shootItem="shootItem" class="mt-4"></shoot-external-tools-card>
        <shoot-lifecycle-card ref="shootLifecycle" :shootItem="shootItem" class="mt-4"></shoot-lifecycle-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card v-if="canGetSecrets" class="mb-4">
          <v-toolbar flat dark dense color="cyan darken-2">
            <v-toolbar-title class="subtitle-1">Access</v-toolbar-title>
          </v-toolbar>
          <shoot-access-card :shootItem="shootItem" @addTerminalShortcut="onAddTerminalShortcut"></shoot-access-card>
        </v-card>
        <shoot-monitoring-card :shootItem="shootItem"></shoot-monitoring-card>
        <tickets-card :tickets="tickets" :shootItem="shootItem" class="mt-4"></tickets-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { mapGetters } from 'vuex'
import filter from 'lodash/filter'
import get from 'lodash/get'
import map from 'lodash/map'

import ShootDetailsCard from '@/components/ShootDetails/ShootDetailsCard'
import CustomFieldsCard from '@/components/ShootDetails/CustomFieldsCard'
import ShootExternalToolsCard from '@/components/ShootDetails/ShootExternalToolsCard'
import ShootInfrastructureCard from '@/components/ShootDetails/ShootInfrastructureCard'
import ShootLifecycleCard from '@/components/ShootDetails/ShootLifecycleCard'
import ShootMonitoringCard from '@/components/ShootDetails/ShootMonitoringCard'
import TicketsCard from '@/components/TicketsCard'

import { shootItem } from '@/mixins/shootItem'

import 'codemirror/mode/yaml/yaml.js'

const ShootAccessCard = () => import('@/components/ShootDetails/ShootAccessCard')

export default {
  name: 'shoot-details',
  components: {
    ShootDetailsCard,
    CustomFieldsCard,
    ShootInfrastructureCard,
    ShootLifecycleCard,
    ShootAccessCard,
    TicketsCard,
    ShootMonitoringCard,
    ShootExternalToolsCard
  },
  mixins: [shootItem],
  props: {
    shootItem: {
      type: Object
    }
  },
  computed: {
    ...mapGetters([
      'ticketsByNamespaceAndName',
      'canGetSecrets',
      'customFieldsListShoot'
    ]),
    info () {
      return get(this, 'shootItem.info', {})
    },
    seedInfo () {
      return get(this, 'shootItem.seedInfo', {})
    },
    tickets () {
      const namespace = this.shootNamespace
      const name = this.shootName
      return this.ticketsByNamespaceAndName({ name, namespace })
    },
    customFields () {
      const customFields = filter(this.customFieldsListShoot, ['showDetails', true])
      return map(customFields, ({ name, path, icon, tooltip, defaultValue }) => ({
        name,
        path,
        icon,
        tooltip,
        defaultValue,
        value: get(this.shootItem, path)
      }))
    }
  },
  methods: {
    onAddTerminalShortcut (shortcut) {
      this.$emit('addTerminalShortcut', shortcut)
    }
  },
  mounted () {
    if (get(this.$route, 'name') === 'ShootItemHibernationSettings') {
      this.$refs.shootLifecycle.showHibernationConfigurationDialog()
    }
  }
}
</script>

<style lang="scss" scoped>
  .subheading.v-card__title {
    line-height: 10px;
  }
</style>
