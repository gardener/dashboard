<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-high-availability-tag
    :popover-key="popoverKey"
    :failure-tolerance-type="shootControlPlaneHighAvailabilityFailureTolerance"
    toolbar-title="Control Plane High Availability"
    :size="size"
    :color="color"
  >
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
  </g-high-availability-tag>
</template>

<script setup>
import { computed } from 'vue'

import GHighAvailabilityTag from '@/components/ControlPlaneHighAvailability/GHighAvailabilityTag.vue'

import { useShootItem } from '@/composables/useShootItem'
import { useShootHelper } from '@/composables/useShootHelper'

defineProps({
  size: {
    type: [String, Number],
    default: undefined,
  },
})

const {
  shootUid,
  shootControlPlaneHighAvailabilityFailureTolerance,
  shootSeedName,
} = useShootItem()

const { isFailureToleranceTypeZoneSupported } = useShootHelper()

const popoverKey = computed(() => {
  return `g-control-plane-hig-availability-tag:${shootUid.value}`
})

const zoneHighAvailabilityConfigurationError = computed(() => {
  return shootControlPlaneHighAvailabilityFailureTolerance.value === 'zone' &&
    !isFailureToleranceTypeZoneSupported.value &&
    !shootSeedName.value
})

const color = computed(() => {
  if (zoneHighAvailabilityConfigurationError.value) {
    return 'error'
  }
  return 'primary'
})
</script>
