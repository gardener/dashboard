<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-tooltip
      location="top"
      :disabled="controlPlaneFailureToleranceTypeChangeAllowed"
      max-width="400px"
    >
      <template #activator="{ props }">
        <div v-bind="props">
          <v-checkbox
            v-model="controlPlaneHighAvailability"
            label="Enable Control Plane High Availability"
            color="primary"
            hide-details
            :disabled="!controlPlaneFailureToleranceTypeChangeAllowed"
            density="compact"
          />
        </div>
      </template>
      It is not possible to change the control plane failure tolerance if a type has already been set
    </v-tooltip>
    <div v-if="!controlPlaneFailureToleranceType">
      No control plane failure tolerance type configured
    </div>
    <v-expand-transition>
      <div v-if="controlPlaneFailureToleranceType">
        Control plane failure tolerance type <code>{{ controlPlaneFailureToleranceType }}</code> configured
        <v-alert
          v-if="controlPlaneFailureToleranceType === 'node' && !zoneSupported"
          type="info"
          variant="outlined"
        >
          <template v-if="clusterIsNew">
            <template v-if="seedName">
              The configured seed <code>{{ seedName }}</code> is not <code>multi-zonal</code>.
            </template>
            <template v-else>
              The selected cloud profile has no <code>multi-zonal</code> seed.
            </template>
          </template>
          <template v-else>
            The current seed <code>{{ seedName }}</code> is not <code>multi-zonal</code>.
          </template>
          Therefore failure tolerance type <code>zone</code> is not supported for this cluster.
        </v-alert>
        <v-alert
          v-if="controlPlaneFailureToleranceTypeChangeAllowed"
          type="info"
          variant="outlined"
        >
          It is not possible to disable or change control plane high availability later.
        </v-alert>
      </div>
    </v-expand-transition>
    <!-- eslint-disable vue/no-v-html -->
    <div
      v-if="!!controlPlaneHighAvailabilityHelpHtml"
      class="wrap-text"
      v-html="controlPlaneHighAvailabilityHelpHtml"
    />
    <g-external-link
      v-else
      url="https://github.com/gardener/gardener/blob/master/docs/usage/shoot_high_availability.md"
    >
      More information
    </g-external-link>
  </div>
</template>

<script>
import {
  mapState,
  mapActions,
} from 'pinia'

import { useShootStagingStore } from '@/store/shootStaging'
import { useCloudProfileStore } from '@/store/cloudProfile'
import { useConfigStore } from '@/store/config'
import { useSeedStore } from '@/store/seed'

import GExternalLink from '@/components/GExternalLink.vue'

import { transformHtml } from '@/utils'

import { some } from '@/lodash'

export default {
  components: {
    GExternalLink,
  },
  computed: {
    ...mapState(useConfigStore, [
      'controlPlaneHighAvailabilityHelpText',
    ]),
    ...mapState(useShootStagingStore, [
      'clusterIsNew',
      'controlPlaneFailureToleranceTypeChangeAllowed',
      'cloudProfileName',
      'controlPlaneFailureToleranceType',
      'seedName',
    ]),
    zoneSupported () {
      const seeds = this.seedName
        ? [this.seedByName(this.seedName)]
        : this.seedsByCloudProfileName(this.cloudProfileName)
      return some(seeds, seed => seed?.data.zones?.length >= 3)
    },
    controlPlaneHighAvailability: {
      get () {
        return !!this.controlPlaneFailureToleranceType
      },
      set (value) {
        if (!value) {
          this.setControlPlaneFailureToleranceType(undefined)
        } else {
          this.setControlPlaneFailureToleranceType(this.zoneSupported ? 'zone' : 'node')
        }
      },
    },
    controlPlaneHighAvailabilityHelpHtml () {
      return transformHtml(this.controlPlaneHighAvailabilityHelpText, true)
    },
  },
  watch: {
    zoneSupported (value) {
      this.resetToleranceType(value)
    },
  },
  mounted () {
    this.resetToleranceType(this.zoneSupported)
  },
  methods: {
    ...mapActions(useCloudProfileStore, [
      'seedsByCloudProfileName',
    ]),
    ...mapActions(useSeedStore, [
      'seedByName',
    ]),
    ...mapActions(useShootStagingStore, [
      'setControlPlaneFailureToleranceType',
    ]),
    resetToleranceType (zoneSupported) {
      if (this.controlPlaneFailureToleranceTypeChangeAllowed) {
        if (!zoneSupported && this.controlPlaneFailureToleranceType === 'zone') {
          this.setControlPlaneFailureToleranceType('node')
        }
        if (zoneSupported && this.controlPlaneFailureToleranceType === 'node') {
          this.setControlPlaneFailureToleranceType('zone')
        }
      }
    },
  },
}
</script>

