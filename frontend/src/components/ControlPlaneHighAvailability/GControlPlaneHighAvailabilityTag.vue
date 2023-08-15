<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popover
    v-if="shootControlPlaneHighAvailabilityFailureTolerance"
    toolbar-title="Control Plane High Availability"
    :toolbar-color="color"
  >
    <template #activator="{ props }">
      <v-chip
        v-bind="props"
        variant="outlined"
        :size="size"
        :color="color"
        class="cursor-pointer ml-1"
      >
        {{ shootControlPlaneHighAvailabilityFailureTolerance }}
      </v-chip>
    </template>
    <g-list
      class="text-left"
      style="max-width: 600px;"
    >
      <g-list-item>
        <template #prepend>
          <v-icon
            icon="mdi-information-outline"
            color="primary"
          />
        </template>
        <g-list-item-content label="Failure Tolerance">
          <code>{{ shootControlPlaneHighAvailabilityFailureTolerance }}</code>
        </g-list-item-content>
      </g-list-item>
      <template v-if="zoneHighAvailabilityConfigurationError">
        <v-divider inset />
        <g-list-item>
          <template #prepend>
            <v-icon
              icon="mdi-alert-circle-outline"
              color="error"
            />
          </template>
          <g-list-item-content label="Configuration Error">
            You configured your control plane failure tolerance type to be <code>zone</code>.
            However, no seed assigned to your cloud profile currently supports this.
          </g-list-item-content>
        </g-list-item>
      </template>
    </g-list>
  </g-popover>
</template>

<script>
import { mapActions } from 'pinia'

import { useCloudProfileStore } from '@/store/cloudProfile'

import { shootItem } from '@/mixins/shootItem'

import { some } from '@/lodash'

export default {
  mixins: [shootItem],
  props: {
    size: {
      type: [String, Number],
    },
  },
  computed: {
    zoneSupported () {
      const seeds = this.seedsByCloudProfileName(this.shootCloudProfileName)
      return some(seeds, ({ data }) => data.zones?.length >= 3)
    },
    zoneHighAvailabilityConfigurationError () {
      return this.shootControlPlaneHighAvailabilityFailureTolerance === 'zone' &&
        !this.zoneSupported &&
        !this.shootSeedName
    },
    color () {
      if (this.zoneHighAvailabilityConfigurationError) {
        return 'error'
      }
      return 'primary'
    },
  },
  methods: {
    ...mapActions(useCloudProfileStore, [
      'seedsByCloudProfileName',
    ]),
  },
}
</script>
@/lodash
