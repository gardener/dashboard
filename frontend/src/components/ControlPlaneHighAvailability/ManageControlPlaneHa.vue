<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip top :disabled="changeAllowed" max-width="400px">
    <template v-slot:activator="{ on }">
      <v-radio-group v-model="haType" v-on="on">
        <div v-on="on">
          <v-radio
            label="Non HA Control Plane (failure tolerance type: none)"
            value="none"
            color="primary"
            :disabled="!changeAllowed"
          ></v-radio>
          <div class="ml-4" :class="{ 'text--disabled': !changeAllowed }">
            No <code>failure tolerance type</code>. Control Plane will be deployed on one node.
            <p>You can set the failure tolerance type later.</p>
          </div>
          <v-radio
            label="Single Zone HA Control Plane (failure tolerance type: node)"
            value="node"
            color="primary"
            :disabled="!changeAllowed"
          ></v-radio>
          <div class="ml-4" :class="{ 'text--disabled': !changeAllowed }">
            <code>Failure tolerance type node</code>. Control Plane will be deployed on multiple nodes in the same zone.
            <p>It is <strong>not</strong> possible to change the failure tolerance type later.</p>
          </div>
          <v-radio
            label="Multi Zone HA Control Plane (failure tolerance type: zone)"
            value="zone"
            color="primary"
            :disabled="!changeAllowed"
          ></v-radio>
          <div class="ml-4" :class="{ 'text--disabled': !changeAllowed }">
            <code>Failure tolerance type zone</code>. Control Plane will be deployed on multiple nodes in the different zones.
            <p>It is <strong>not</strong> possible to change the failure tolerance type later.</p>
            <v-alert type="warning" v-if="haType === 'zone'">
              <template v-if="clusterIsNew">
                The selected cloud profile has no seed which supports failure tolerance type 'zone'.
              </template>
              <template v-else>
                The current seed {{configuredSeed}} does not support failure tolerance type 'zone'.
              </template>
              Your cluster might not be scheduled.
            </v-alert>
          </div>
        </div>
      </v-radio-group>
    </template>
    It is not possible to change the control plane failure tolerance type if a type has already been set
  </v-tooltip>
</template>

<script>

import { mapGetters, mapState, mapActions } from 'vuex'
import some from 'lodash/some'

export default {
  name: 'manage-control-plane-ha',
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
      'seedByName'
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
    haType: {
      get () {
        return this.cpFailureToleranceType ?? 'none'
      },
      set (value) {
        if (value === 'none') {
          this.setCpFailureToleranceType(undefined)
        }
        this.setCpFailureToleranceType(value)
      }
    }
  },
  methods: {
    ...mapActions('shootStaging', [
      'setCpFailureToleranceType'
    ])
  },
  watch: {
    zoneSupported (value) {
      if (!value && this.haType === 'zone') {
        this.haType = 'node'
      }
    }
  }
}
</script>
