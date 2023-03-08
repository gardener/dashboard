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
    <v-expand-transition :appear="animateOnAppear" v-else>
      <div>
        Control plane failure tolerance type <code>{{controlPlaneFailureToleranceType}}</code> configured
        <v-alert type="info" v-if="controlPlaneFailureToleranceType === 'node' && !zoneSupported" dense outlined>
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
        <v-alert type="info" v-if="controlPlaneFailureToleranceTypeChangeAllowed" dense outlined>
          It is not possible to disable or change control plane high availability later.
        </v-alert>
      </div>
    </v-expand-transition>
    <div v-if="!!controlPlaneHighAvailabilityHelpHtml" class="wrap-text" v-html="controlPlaneHighAvailabilityHelpHtml"></div>
    <external-link v-else url="https://github.com/gardener/gardener/blob/master/docs/usage/shoot_high_availability.md">More information</external-link>
  </div>
</template>

<script>

import { mapGetters, mapState, mapActions } from 'vuex'
import { transformHtml } from '@/utils'
import some from 'lodash/some'
import ExternalLink from '@/components/ExternalLink.vue'

export default {
  components: {
    ExternalLink
  },
  data () {
    return {
      animateOnAppear: false
    }
  },
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
      'setControlPlaneFailureToleranceType'
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
  watch: {
    zoneSupported (value) {
      this.resetToleranceType(value)
    }
  },
  mounted () {
    this.resetToleranceType(this.zoneSupported)
    this.animateOnAppear = true
  }
}
</script>
