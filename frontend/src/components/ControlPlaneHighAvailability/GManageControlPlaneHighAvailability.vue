<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-tooltip:top="{
      text: 'It is not possible to change the control plane failure tolerance if a type has already been set',
      disabled: controlPlaneHighAvailabilityFailureToleranceTypeChangeAllowed,
      maxWidth: 400
    }"
  >
    <v-checkbox
      v-model="controlPlaneHighAvailability"
      label="Enable Control Plane High Availability"
      color="primary"
      hide-details
      :disabled="!controlPlaneHighAvailabilityFailureToleranceTypeChangeAllowed"
      density="compact"
      class="mb-2"
    />
    <v-alert
      v-if="!controlPlaneHighAvailabilityFailureToleranceType"
      border-color="primary"
      border
      class="pl-3"
    >
      No control plane failure tolerance type configured
    </v-alert>
  </div>
  <v-expand-transition>
    <div v-if="controlPlaneHighAvailabilityFailureToleranceType">
      <v-alert
        border-color="primary"
        border
        class="pl-3 mb-3"
      >
        Control plane failure tolerance type <code>{{ controlPlaneHighAvailabilityFailureToleranceType }}</code> configured
      </v-alert>
      <v-alert
        type="info"
        variant="tonal"
      >
        <div v-if="controlPlaneHighAvailabilityFailureToleranceType === 'node' && !isFailureToleranceTypeZoneSupported">
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
        <div v-if="controlPlaneHighAvailabilityFailureToleranceTypeChangeAllowed">
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
      url="https://github.com/gardener/gardener/blob/master/docs/usage/high-availability/shoot_high_availability.md"
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
      controlPlaneHighAvailabilityFailureToleranceType,
      controlPlaneHighAvailabilityFailureToleranceTypeChangeAllowed,
      controlPlaneHighAvailability,
    } = useShootContext()

    return {
      isNewCluster,
      seedName,
      isFailureToleranceTypeZoneSupported,
      controlPlaneHighAvailabilityFailureToleranceType,
      controlPlaneHighAvailabilityFailureToleranceTypeChangeAllowed,
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
