<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popover
    v-model="internalValue"
    :disbaled="!shootControlPlaneHighAvailabilityFailureTolerance"
    toolbar-title="Control Plane High Availability"
    :toolbar-color="color"
  >
    <template #activator="{ props }">
      <v-chip
        v-if="shootControlPlaneHighAvailabilityFailureTolerance"
        v-bind="props"
        variant="tonal"
        :size="size"
        :color="color"
        class="cursor-pointer"
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
import { useShootItem } from '@/composables/useShootItem'
import { useShootHelper } from '@/composables/useShootHelper'

export default {
  inject: [
    'activePopoverKey',
  ],
  props: {
    size: {
      type: [String, Number],
    },
  },
  setup () {
    const {
      shootUid,
      shootCloudProfileRef,
      shootControlPlaneHighAvailabilityFailureTolerance,
      shootSeedName,
    } = useShootItem()

    const { isFailureToleranceTypeZoneSupported } = useShootHelper()

    return {
      shootUid,
      shootCloudProfileRef,
      shootControlPlaneHighAvailabilityFailureTolerance,
      shootSeedName,
      isFailureToleranceTypeZoneSupported,
    }
  },
  computed: {
    popoverKey () {
      return `g-control-plane-hig-availability-tag:${this.shootUid}`
    },
    internalValue: {
      get () {
        return this.activePopoverKey === this.popoverKey
      },
      set (value) {
        this.activePopoverKey = value ? this.popoverKey : ''
      },
    },
    zoneHighAvailabilityConfigurationError () {
      return this.shootControlPlaneHighAvailabilityFailureTolerance === 'zone' &&
        !this.isFailureToleranceTypeZoneSupported &&
        !this.shootSeedName
    },
    color () {
      if (this.zoneHighAvailabilityConfigurationError) {
        return 'error'
      }
      return 'primary'
    },
  },
}
</script>
