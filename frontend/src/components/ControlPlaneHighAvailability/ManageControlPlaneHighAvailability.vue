<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-tooltip top :disabled="controlPlaneFailureToleranceTypeChangeAllowed" max-width="400px">
      <template v-slot:activator="{ on }">
        <div v-on="on">
          <v-checkbox
            v-model="controlPlaneHighAvailability"
            label="Enable Control Plane High Availability"
            color="primary"
            hide-details
            :disabled="!controlPlaneFailureToleranceTypeChangeAllowed"
            ></v-checkbox>
        </div>
      </template>
      It is not possible to change the control plane failure tolerance if a type has already been set
    </v-tooltip>
    <div v-if="!controlPlaneFailureToleranceType">
      No control plane failure tolerance type configured
    </div>
  </div>
</template>

<script>

import { mapGetters, mapState, mapActions } from 'vuex'
import { transformHtml } from '@/utils'
import some from 'lodash/some'

export default {
  computed: {
    ...mapGetters([
      'seedsByCloudProfileName',
      'seedByName',
      'controlPlaneHighAvailabilityHelpText'
    ]),
    ...mapGetters('shootStaging', [
      'clusterIsNew',
      'controlPlaneFailureToleranceTypeChangeAllowed'
    ]),
    ...mapState('shootStaging', [
      'cloudProfileName',
      'controlPlaneFailureToleranceType',
      'seedName'
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
      }
    },
    controlPlaneHighAvailabilityHelpHtml () {
      return transformHtml(this.controlPlaneHighAvailabilityHelpText, true)
    }
  },
  methods: {
    ...mapActions('shootStaging', [
      'setControlPlaneFailureToleranceType',
      'shouldHaveHighAvailableControlPlane'
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
    }
  },
  props: {
    userInterActionBus: {
      type: Object,
      required: true
    }
  },
  watch: {
    zoneSupported (value) {
      this.resetToleranceType(value)
    }
  },
  mounted () {
    this.resetToleranceType(this.zoneSupported)

    if (this.userInterActionBus) {
      this.userInterActionBus.on('updatePurpose', purpose => {
        if (purpose === 'production') {
          this.setControlPlaneFailureToleranceType('node')
        } else {
          this.setControlPlaneFailureToleranceType()
        }
      })
    }
  }
}
</script>
