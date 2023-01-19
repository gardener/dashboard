<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-tooltip top :disabled="changeAllowed" max-width="400px">
      <template v-slot:activator="{ on }">
        <div v-on="on">
          <v-checkbox
            v-model="controlPlaneHighAvailability"
            label="Enable Control Plane High Availability"
            color="primary"
            hide-details
            :disabled="!changeAllowed"
            ></v-checkbox>
        </div>
      </template>
      It is not possible to change the control plane failure tolerance if a type has already been set
    </v-tooltip>
    <div v-if="!controlPlaneFailureToleranceType">
      No control plane failure tolerance type configured
    </div>
    <div v-else>
      Control plane failure tolerance type <code>controlPlaneFailureToleranceType</code> configured
      <v-alert type="info" v-if="controlPlaneFailureToleranceType === 'node' && !zoneSupported" dense outlined>
        <template v-if="clusterIsNew">
          The selected cloud profile has no <code>multi-zonal</code> seed.
        </template>
        <template v-else>
          The current Seed {{configuredSeed}} is not <code>multi-zonal</code>.
        </template>
        Therefore failure tolerance type <code>zone</code> is not supported for this cluster.
      </v-alert>
      <v-alert type="info" v-if="changeAllowed" dense outlined>
        It is not possible to disable or change control plane high availability later.
      </v-alert>
    </div>
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
  props: {
    configuredSeed: {
      type: String
    },
    configuredControlPlaneFailureToleranceType: {
      type: String
    }
  },
  computed: {
    ...mapGetters([
      'seedsByCloudProfileName',
      'seedByName',
      'controlPlaneHighAvailabilityHelpText'
    ]),
    ...mapGetters('shootStaging', [
      'clusterIsNew'
    ]),
    ...mapState('shootStaging', [
      'cloudProfileName',
      'controlPlaneFailureToleranceType'
    ]),
    changeAllowed () {
      return this.clusterIsNew || !this.configuredControlPlaneFailureToleranceType
    },
    zoneSupported () {
      const seeds = this.configuredSeed
        ? [this.seedByName(this.configuredSeed)]
        : this.seedsByCloudProfileName(this.cloudProfileName)
      return some(seeds, ({ data }) => data.zones?.length >= 3)
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
    ])
  },
  watch: {
    zoneSupported (value) {
      if (!value && this.controlPlaneFailureToleranceType === 'zone') {
        this.setControlPlaneFailureToleranceType('node')
      }
    }
  }
}
</script>
