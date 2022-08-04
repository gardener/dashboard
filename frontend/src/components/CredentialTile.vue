<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-list-item :dense="dense">
    <v-list-item-icon>
      <v-icon v-if="!dense" :color="iconColor">mdi-key-change</v-icon>
    </v-list-item-icon>
    <v-list-item-content :class="{'py-0 my-0' : dense}">
      <v-list-item-title class="d-flex align-center">
        {{title}}
        <v-tooltip top :disabled="!showChipTooltip">
          <template v-slot:activator="{ on }">
            <v-chip v-on="on" v-if="showChip" :color="phaseColor" label x-small class="ml-2" outlined>{{phaseCaption}}</v-chip>
          </template>
          All two-phase operations need to be in phase "Prepared" in order to complete the rotation of all credentials
        </v-tooltip>
      </v-list-item-title>
      <v-list-item-subtitle class="d-flex align-center">
        <template v-if="type === 'certificateAuthorities' && !isCACertificateValiditiesAcceptable">
          <shoot-messages :shoot-item="shootItem" :filter="['cacertificatevalidities-constraint']" small class="mr-1" />
          <span color="warning">Certificate Authorities will expire in less than one year</span>
        </template>
        <template v-else>
          <span v-if="showLastInitiationTime">Rotation Initiated: <time-string :date-time="lastInitiationTime" mode="past"></time-string></span>
          <span v-if="showLastCompletionTime">Last Rotated: <time-string :date-time="lastCompletionTime" mode="past"></time-string></span>
        </template>
      </v-list-item-subtitle>
    </v-list-item-content>
    <v-list-item-action :class="{'py-0 my-1' : dense}">
      <rotate-credentials :shoot-item="shootItem" :type="type"></rotate-credentials>
    </v-list-item-action>
  </v-list-item>
</template>

<script>
import RotateCredentials from '@/components/RotateCredentials'
import TimeString from '@/components/TimeString'
import ShootMessages from '@/components/ShootMessages/ShootMessages'
import { shootItem } from '@/mixins/shootItem'
import get from 'lodash/get'
import flatMap from 'lodash/flatMap'
import head from 'lodash/head'
import { rotationTypes } from '@/utils'

export default {
  name: 'credential-tile',
  components: {
    RotateCredentials,
    TimeString,
    ShootMessages
  },
  props: {
    title: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: false
    },
    dense: {
      type: Boolean,
      required: false
    }
  },
  mixins: [shootItem],
  computed: {
    rotationStatus () {
      return get(this.shootStatusCredentialRotation, this.type, {})
    },
    lastInitiationTime () {
      if (this.type) {
        return this.rotationStatus.lastInitiationTime
      }
      // Do not show aggregated initiation time
      return undefined
    },
    lastCompletionTime () {
      if (this.type) {
        return this.rotationStatus.lastCompletionTime
      }
      const allCompletionTimes = flatMap(this.shootStatusCredentialRotation, 'lastCompletionTime').sort()
      let requiredNumberOfRotationTimes = rotationTypes.numberOfOperations()
      if (!this.shootEnableStaticTokenKubeconfig) {
        requiredNumberOfRotationTimes = requiredNumberOfRotationTimes - 1
      }
      if (requiredNumberOfRotationTimes === allCompletionTimes.length) {
        return head(allCompletionTimes)
      }
      return undefined
    },
    phase () {
      if (this.type) {
        return this.rotationStatus.phase
      }
      return this.shootStatusCredentialRotationAggregatedPhase
    },
    phaseType () {
      if (typeof this.phase === 'object') {
        return get(this.phase, 'type')
      }
      return this.phase
    },
    phaseCaption () {
      if (typeof this.phase === 'object') {
        return get(this.phase, 'caption')
      }
      return this.phase
    },
    phaseColor () {
      switch (this.phaseType) {
        case 'Prepared':
        case 'Completed':
          return 'primary'
        default:
          return 'info'
      }
    },
    iconColor () {
      if (!this.isCACertificateValiditiesAcceptable) {
        return 'warning'
      }
      return 'primary'
    },
    showLastInitiationTime () {
      return (this.lastInitiationTime && !this.lastCompletionTime) || this.lastInitiationTime > this.lastCompletionTime
    },
    showLastCompletionTime () {
      return (this.lastCompletionTime && !this.lastInitiationTime) || this.lastCompletionTime > this.lastInitiationTime
    },
    showChip () {
      return this.phaseType && this.phaseType !== 'Completed'
    },
    showChipTooltip () {
      return this.phaseType === 'Prepared' && typeof this.phase === 'object' && this.phase.incomplete
    }
  }
}
</script>
