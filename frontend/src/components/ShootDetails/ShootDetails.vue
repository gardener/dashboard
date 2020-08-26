<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 -->
<template>
  <v-container fluid>
    <v-row class="d-flex">
      <v-col cols="12" md="6">
        <shoot-details-card :shootItem="shootItem"></shoot-details-card>
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
import ShootAccessCard from '@/components/ShootDetails/ShootAccessCard'
import TicketsCard from '@/components/TicketsCard'
import ShootMonitoringCard from '@/components/ShootDetails/ShootMonitoringCard'
import ShootDetailsCard from '@/components/ShootDetails/ShootDetailsCard'
import ShootInfrastructureCard from '@/components/ShootDetails/ShootInfrastructureCard'
import ShootLifecycleCard from '@/components/ShootDetails/ShootLifecycleCard'
import ShootExternalToolsCard from '@/components/ShootDetails/ShootExternalToolsCard'
import get from 'lodash/get'
import { shootItem } from '@/mixins/shootItem'

import 'codemirror/mode/yaml/yaml.js'

export default {
  name: 'shoot-item',
  components: {
    ShootDetailsCard,
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
      'canGetSecrets'
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
