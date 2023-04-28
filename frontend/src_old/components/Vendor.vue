<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <span v-if="title">{{ titleText }}</span>
  <!-- we make the tooltip background transparent so that it does not conflict with the cards background -->
  <v-tooltip v-else location="top" color="rgba(0, 0, 0, 1)" content-class="tooltip">
    <template v-slot:activator="{ on }">
      <div class="d-flex align-center" v-on="on">
        <infra-icon :value="cloudProviderKind" class="mr-2"></infra-icon>
        {{ description }}
      </div>
    </template>
    <v-card>
      <v-list>
        <v-list-item>
          <v-list-item-content class="pa-0">
            <v-list-item-subtitle>Provider</v-list-item-subtitle>
            <v-list-item-title class="d-flex"><infra-icon :value="cloudProviderKind" class="mr-2"></infra-icon>{{ cloudProviderKind }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item v-if="cloudProfileName">
          <v-list-item-content class="pa-0">
            <v-list-item-subtitle>Cloud Profile</v-list-item-subtitle>
            <v-list-item-title>{{ cloudProfileName }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item v-if="region">
          <v-list-item-content class="pa-0">
            <v-list-item-subtitle>Region</v-list-item-subtitle>
            <v-list-item-title>{{ region }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item v-if="zones.length">
          <v-list-item-content class="pa-0">
            <v-list-item-subtitle>{{zoneTitle}}</v-list-item-subtitle>
            <v-list-item-title>{{zoneText}}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-card>
  </v-tooltip>
</template>

<script>
import join from 'lodash/join'
import InfraIcon from '@/components/VendorIcon.vue'

export default {
  components: {
    InfraIcon
  },
  props: {
    zones: {
      type: Array,
      default: () => []
    },
    cloudProviderKind: {
      type: String
    },
    cloudProfileName: {
      type: String
    },
    region: {
      type: String
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
  computed: {
    zoneText () {
      return join(this.zones, ', ')
    },
    zoneTitle () {
      if (this.zones.length > 1) {
        return 'Zones'
      }
      return 'Zone'
    },
    description () {
      const description = []
      if (this.extended && this.cloudProviderKind) {
        description.push(this.cloudProviderKind)
      }
      if (this.cloudProfileName) {
        description.push(this.cloudProfileName)
      }
      if (this.region) {
        description.push(this.region)
      }
      if (this.extended && this.zones.length) {
        description.push(this.zoneText)
      }

      return join(description, ' / ')
    },
    titleText () {
      const titles = []
      if (this.extended && this.cloudProviderKind) {
        titles.push('Provider')
      }
      if (this.cloudProfileName) {
        titles.push('Profile')
      }
      if (this.region) {
        titles.push('Region')
      }
      if (this.extended && this.zones.length) {
        titles.push(this.zoneTitle)
      }
      return join(titles, ' / ')
    }
  }
}
</script>

<style lang="scss" scoped>
  .tooltip {
    opacity: 1 !important;
    padding: 0;
  }
</style>
