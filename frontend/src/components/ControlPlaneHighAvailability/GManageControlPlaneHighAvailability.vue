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
            class="mb-2"
          />
        </div>
      </template>
      It is not possible to change the control plane failure tolerance if a type has already been set
    </v-tooltip>
    <v-alert
      v-if="!controlPlaneFailureToleranceType"
      border-color="primary"
      border
      class="pl-3"
    >
      No control plane failure tolerance type configured
    </v-alert>
  </div>
  <v-expand-transition>
    <div v-if="controlPlaneFailureToleranceType">
      <v-alert
        border-color="primary"
        border
        class="pl-3 mb-3"
      >
        Control plane failure tolerance type <code>{{ controlPlaneFailureToleranceType }}</code> configured
      </v-alert>
      <v-alert
        type="info"
        variant="tonal"
      >
        <div v-if="controlPlaneFailureToleranceType === 'node' && !isFailureToleranceTypeZoneSupported">
          <template v-if="isNewCluster">
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
        </div>
        <div v-if="controlPlaneFailureToleranceTypeChangeAllowed">
          It is not possible to disable or change control plane high availability later.
        </div>
      </v-alert>
    </div>
  </v-expand-transition>
  <div class="mt-3">
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
import { mapState } from 'pinia'

import { useConfigStore } from '@/store/config'

import GExternalLink from '@/components/GExternalLink.vue'

import { useShootContext } from '@/composables/useShootContext'

import { transformHtml } from '@/utils'

export default {
  components: {
    GExternalLink,
  },
  setup () {
    const {
      isNewCluster,
      seedName,
      isFailureToleranceTypeZoneSupported,
      controlPlaneFailureToleranceType,
      controlPlaneFailureToleranceTypeChangeAllowed,
      controlPlaneHighAvailability,
    } = useShootContext()

    return {
      isNewCluster,
      seedName,
      isFailureToleranceTypeZoneSupported,
      controlPlaneFailureToleranceType,
      controlPlaneFailureToleranceTypeChangeAllowed,
      controlPlaneHighAvailability,
    }
  },
  computed: {
    ...mapState(useConfigStore, [
      'controlPlaneHighAvailabilityHelpText',
    ]),
    controlPlaneHighAvailabilityHelpHtml () {
      return transformHtml(this.controlPlaneHighAvailabilityHelpText, true)
    },
  },
}
</script>
