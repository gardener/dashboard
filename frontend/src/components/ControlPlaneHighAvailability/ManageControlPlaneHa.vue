<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-radio-group v-model="haType">
    <v-tooltip top :disabled="changeAllowed" max-width="400px">
      <template v-slot:activator="{ on }">
        <div v-on="on">
          <v-radio
            label="Non HA Control Plane (failure tolerance type: none)"
            value="none"
            color="primary"
            :disabled="!changeAllowed"
          ></v-radio>
        </div>
      </template>
      <span>{{tooltipText}}</span>
    </v-tooltip>
    <span v-show="haType === 'none'" class="ml-2">
      High availability disabled: Control Plane will be deployed on one node.
      <p>It is possible to upgrade to a high availability setup later.</p>
    </span>
    <v-tooltip top :disabled="changeAllowed" max-width="400px">
      <template v-slot:activator="{ on }">
        <div v-on="on">
          <v-radio
            label="Single Zone HA Control Plane (failure tolerance type: node)"
            value="node"
            color="primary"
            :disabled="!changeAllowed"
          ></v-radio>
        </div>
      </template>
      <span>{{tooltipText}}</span>
    </v-tooltip>
    <span v-show="haType === 'node'" class="ml-2">
      High availability type <code>node</code>: Control Plane will be deployed on multiple nodes in the same zone.
      <p>It is <strong>not</strong> possible to upgrade to high availability type <code>zone</code> or downgrade to a non high availability setup later.</p>
    </span>
    <v-tooltip top :disabled="changeAllowed && zoneSupported" max-width="400px">
      <template v-slot:activator="{ on }">
        <div v-on="on">
          <v-radio
            label="Multi Zone HA Control Plane (failure tolerance type: zone)"
            value="zone"
            color="primary"
            :disabled="!changeAllowed || !zoneSupported"
          ></v-radio>
        </div>
      </template>
      <span>{{tooltipText}}</span>
    </v-tooltip>
    <span v-show="haType === 'zone'" class="ml-2">
      High availability type <code>zone</code>: Control Plane will be deployed on multiple nodes in different zones.
      <p>It is <strong>not</strong> possible to downgrade to high availability type <code>node</code> or downgrade to a non high availability setup later.</p>
    </span>
  </v-radio-group>
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
    tooltipText () {
      if (!this.changeAllowed) {
        return 'It is not possible to change the control plane failure tolerance type if a type has already been set'
      }
      if (!this.zoneSupported) {
        if (this.clusterIsNew) {
          return 'The selected cloud profile has no seed which supports failure tolerance type \'zone\''
        } else {
          return `The current seed '${this.configuredSeed}' does not support failure tolerance type 'zone'. Please migrate your control plane to a seed that supports failure tolerance type 'zone' for control planes.`
        }
      }
      return undefined
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
