<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <span v-if="title">{{ titleText }}</span>
  <!-- we make the tooltip background transparent so that it does not conflict with the cards background -->
  <v-tooltip
    v-else
    location="top"
    :open-delay="200"
  >
    <template #activator="{ props }">
      <div
        class="d-flex align-center"
        v-bind="props"
      >
        <g-vendor-icon
          :icon="providerType"
        />
        <span
          v-if="description"
          class="ml-2"
        >
          {{ description }}
        </span>
      </div>
    </template>
    <v-card elevation="12">
      <v-list>
        <v-list-item>
          <v-list-item-subtitle>Provider</v-list-item-subtitle>
          <v-list-item-title class="d-flex">
            <g-vendor-icon
              :icon="providerType"
              class="mr-2"
            />
            {{ providerType }}
          </v-list-item-title>
        </v-list-item>
        <v-list-item v-if="shootCloudProfileRef">
          <v-list-item-subtitle>Cloud Profile</v-list-item-subtitle>
          <v-list-item-title>{{ cloudProfileRefDisplayValue }}</v-list-item-title>
        </v-list-item>
        <v-list-item v-if="region">
          <v-list-item-subtitle>Region</v-list-item-subtitle>
          <v-list-item-title>{{ region }}</v-list-item-title>
        </v-list-item>
        <v-list-item v-if="zones.length">
          <v-list-item-subtitle>{{ zoneTitle }}</v-list-item-subtitle>
          <v-list-item-title>{{ zoneText }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-card>
  </v-tooltip>
</template>

<script>
import GVendorIcon from '@/components/GVendorIcon'

import { useShootItem } from '@/composables/useShootItem'

import join from 'lodash/join'

export default {
  components: {
    GVendorIcon,
  },
  props: {
    zones: {
      type: Array,
      default: () => [],
    },
    providerType: {
      type: String,
    },
    region: {
      type: String,
    },
    title: {
      type: Boolean,
      default: false,
    },
    extended: {
      type: Boolean,
      default: false,
    },
  },
  setup () {
    const {
      shootCloudProfileRef,
    } = useShootItem() ?? {}
    return {
      shootCloudProfileRef,
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
      if (this.extended && this.providerType) {
        description.push(this.providerType)
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
      if (this.extended && this.providerType) {
        titles.push('Provider')
      }
      if (this.region) {
        titles.push('Region')
      }
      if (this.extended && this.zones.length) {
        titles.push(this.zoneTitle)
      }
      return join(titles, ' / ')
    },
    cloudProfileRefDisplayValue () {
      if (!this.shootCloudProfileRef) {
        return ''
      }

      if (this.shootCloudProfileRef.kind === 'NamespacedCloudProfile') {
        return `${this.shootCloudProfileRef.name} (Namespaced)`
      }

      return this.shootCloudProfileRef.name
    },
  },
}
</script>

<style lang="scss" scoped>
  :deep(.v-overlay__content) {
    opacity: 1 !important;
    padding: 0;
  }
</style>
