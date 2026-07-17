<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <span v-if="title">{{ titleText }}</span>
  <div
    v-else
    class="d-flex align-center vendor-activator"
    tabindex="0"
    :aria-label="vendorAriaLabel"
  >
    <g-vendor-icon
      :name="providerType"
    />
    <span
      v-if="description"
      class="ml-2"
    >
      {{ description }}
    </span>
    <g-detail-tooltip
      activator="parent"
      :title="tooltipTitle"
    >
      <dl class="tooltip-details">
        <div class="tooltip-row">
          <dt>Provider</dt>
          <dd class="d-flex align-center">
            <g-vendor-icon
              :name="providerType"
              class="mr-2"
            />
            {{ vendorName }}
          </dd>
        </div>
        <div
          v-if="shootCloudProfileRef"
          class="tooltip-row"
        >
          <dt>Cloud profile</dt>
          <dd>{{ cloudProfileRefDisplayValue }}</dd>
        </div>
        <div
          v-if="region"
          class="tooltip-row"
        >
          <dt>Region</dt>
          <dd>{{ region }}</dd>
        </div>
        <div
          v-if="zones.length"
          class="tooltip-row"
        >
          <dt>{{ zoneTitle }}</dt>
          <dd>{{ zoneText }}</dd>
        </div>
      </dl>
    </g-detail-tooltip>
  </div>
</template>

<script>
import { mapActions } from 'pinia'

import { useConfigStore } from '@/store/config'

import GVendorIcon from '@/components/GVendorIcon'
import GDetailTooltip from '@/components/GDetailTooltip.vue'

import { useShootItem } from '@/composables/useShootItem'

import join from 'lodash/join'

export default {
  components: {
    GDetailTooltip,
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
    tooltipTitle: {
      type: String,
      default: 'Infrastructure',
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
        description.push(this.vendorName)
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
    vendorName () {
      return this.vendorDisplayName(this.providerType)
    },
    vendorAriaLabel () {
      const details = [`Provider ${this.vendorName}`]
      if (this.shootCloudProfileRef) {
        details.push(`cloud profile ${this.cloudProfileRefDisplayValue}`)
      }
      if (this.region) {
        details.push(`region ${this.region}`)
      }
      if (this.zones.length) {
        details.push(`${this.zoneTitle.toLowerCase()} ${this.zoneText}`)
      }
      return `${this.tooltipTitle}: ${details.join(', ')}`
    },
  },
  methods: {
    ...mapActions(useConfigStore, ['vendorDisplayName']),
  },
}
</script>

<style lang="scss" scoped>
  .vendor-activator {
    width: fit-content;
  }

  .tooltip-details {
    display: grid;
    gap: 10px;
    margin: 0;
  }

  .tooltip-row {
    display: grid;
    gap: 16px;
    grid-template-columns: minmax(88px, auto) minmax(0, 1fr);

    dt {
      color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
    }

    dd {
      font-variant-numeric: tabular-nums;
      margin: 0;
      overflow-wrap: anywhere;
    }
  }
</style>
