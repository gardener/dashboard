<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <span v-if="title">{{ shootZones.length ? `Provider / Region / ${zoneTitle}` : 'Provider / Region' }}</span>
  <v-tooltip v-else top>
    <template v-slot:activator="{ on }">
      <div class="d-flex align-center" v-on="on">
        <infra-icon v-model="shootCloudProviderKind" class="mr-2"></infra-icon>
        {{ description }}
      </div>
    </template>
    <v-card color="transparent">
      <v-list color="transparent">
        <v-list-item>
          <v-list-item-content class="pa-0">
            <v-list-item-subtitle class="white--text">Provider</v-list-item-subtitle>
            <v-list-item-title class="d-flex white--text"><infra-icon v-model="shootCloudProviderKind" class="mr-2" dark-background></infra-icon>{{ shootCloudProviderKind }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item>
          <v-list-item-content class="pa-0">
            <v-list-item-subtitle class="white--text">Region</v-list-item-subtitle>
            <v-list-item-title class="white--text">{{ shootRegion }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item v-if="shootZones.length">
          <v-list-item-content class="pa-0">
            <v-list-item-subtitle class="white--text">{{zoneTitle}}</v-list-item-subtitle>
            <v-list-item-title class="white--text">{{shootZonesText}}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-card>
  </v-tooltip>
</template>

<script>
import join from 'lodash/join'
import InfraIcon from '@/components/VendorIcon'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    InfraIcon
  },
  props: {
    shootItem: {
      type: Object,
      required: true
    },
    title: {
      type: Boolean,
      default: false
    },
    extended: {
      type: Boolean,
      default: false
    }
  },
  mixins: [shootItem],
  computed: {
    shootZonesText () {
      return join(this.shootZones, ', ')
    },
    zoneTitle () {
      if (this.shootZones.length > 1) {
        return 'Zones'
      }
      return 'Zone'
    },
    description () {
      const description = []
      if (this.extended) {
        description.push(this.shootCloudProviderKind)
        description.push(this.shootRegion)
        if (this.shootZones.length > 0) {
          description.push(this.shootZonesText)
        }
      } else {
        description.push(this.shootRegion)
      }

      return join(description, ' / ')
    }
  }
}
</script>
