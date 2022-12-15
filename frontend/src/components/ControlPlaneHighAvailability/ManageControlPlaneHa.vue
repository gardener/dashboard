<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-tooltip top :disabled="changeAllowed" max-width="400px">
      <template v-slot:activator="{ on }">
        <div v-on="on">
          <v-checkbox
            v-model="controlPlaneHa"
            label="Enable Control Plane High Availability"
            color="primary"
            hide-details
            :disabled="!changeAllowed"
            ></v-checkbox>
        </div>
      </template>
      It is not possible to change the control plane failure tolerance if a type has already been set
    </v-tooltip>
    <div v-if="!cpFailureToleranceType">
      No control plane failure tolerance type configured
    </div>
    <div v-if="cpFailureToleranceType === 'node'">
      Control plane failure tolerance type <code>node</code> configured
      <v-alert type="info" v-if="!zoneSupported" dense outlined>
        <template v-if="clusterIsNew">
          The selected cloud profile has no <code>multi-zonal</code> seed.
        </template>
        <template v-else>
          The current seed {{configuredSeed}} is not <code>multi-zonal</code>.
        </template>
        Therefore failure tolerance type <code>zone</code> is not supported for this cluster.
      </v-alert>
    </div>
    <div v-if="cpFailureToleranceType === 'zone'">
      Control plane failure tolerance type <code>zone</code> configured
    </div>
    <v-alert type="info" v-if="!!cpFailureToleranceType && changeAllowed" dense outlined>
      It is not possible to disable control plane high availability later.
    </v-alert>
    <div v-if="!!controlPlaneHaHelpHtml" class="wrap-text" v-html="controlPlaneHaHelpHtml"></div>
    <external-link v-else url="https://github.com/gardener/gardener/blob/master/docs/usage/shoot_high_availability.md">More information</external-link>
  </div>
</template>

<script>

import { mapGetters, mapState, mapActions } from 'vuex'
import { transformHtml } from '@/utils'
import some from 'lodash/some'
import ExternalLink from '@/components/ExternalLink.vue'

export default {
  name: 'manage-control-plane-ha',
  components: {
    ExternalLink
  },
  props: {
    configuredSeed: {
      type: String
    },
    configuredCpFailureToleranceType: {
      type: String
    }
  },
  computed: {
    ...mapGetters([
      'seedsByCloudProfileName',
      'seedByName',
      'controlPlaneHaHelpText'
    ]),
    ...mapGetters('shootStaging', [
      'clusterIsNew'
    ]),
    ...mapState('shootStaging', [
      'cloudProfileName',
      'cpFailureToleranceType'
    ]),
    changeAllowed () {
      if (this.clusterIsNew) {
        return true
      }
      if (!this.configuredCpFailureToleranceType) {
        return true
      }
      return false
    },
    zoneSupported () {
      let seeds
      if (this.configuredSeed) {
        seeds = [this.seedByName(this.configuredSeed)]
      } else {
        seeds = this.seedsByCloudProfileName(this.cloudProfileName)
      }
      return some(seeds, ({ data }) => data.zones.length >= 3)
    },
    controlPlaneHa: {
      get () {
        return !!this.cpFailureToleranceType
      },
      set (value) {
        if (!value) {
          this.setCpFailureToleranceType(undefined)
        } else {
          this.setCpFailureToleranceType(this.zoneSupported ? 'zone' : 'node')
        }
      }
    },
    controlPlaneHaHelpHtml () {
      return transformHtml(this.controlPlaneHaHelpText, true)
    }
  },
  methods: {
    ...mapActions('shootStaging', [
      'setCpFailureToleranceType'
    ])
  },
  watch: {
    zoneSupported (value) {
      if (!value && this.cpFailureToleranceType === 'zone') {
        this.setCpFailureToleranceType('node')
      }
    }
  }
}
</script>
