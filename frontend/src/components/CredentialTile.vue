<!--
SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors

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
        <v-tooltip top v-if="phaseType === 'Prepared'">
          <template v-slot:activator="{ on }">
            <v-chip v-on="on" v-if="showChip" :color="phaseColor" label x-small class="ml-2" outlined>{{phaseCaption}}</v-chip>
          </template>
          <template v-if="phase.incomplete">
            <div>
              <strong>
                All two-phase credentials rotations need to be in phase
                <v-chip color="primary" label x-small class="ml-2">Prepared</v-chip>
                in order to perform this operation
              </strong>
            </div>
            <div>Please initiate rotation of the followig phases</div>
            <ul v-if="phase">
              <li v-for="{title} in phase.unpreparedRotations" :key="title">{{title}}</li>
            </ul>
          </template>
          <template v-else>
            <div>
              This two-phase oepration is in phase
              <v-chip color="primary" label x-small class="ml-2">Prepared</v-chip>
            </div>
            <div>
              Rotation Initiated: <time-string :date-time="lastInitiationTime" mode="past"></time-string>
            </div>
          </template>
        </v-tooltip>
      </v-list-item-title>
      <v-list-item-subtitle class="d-flex align-center">
        <template v-if="type === 'certificateAuthorities' && !isCACertificateValiditiesAcceptable">
          <shoot-messages :shoot-item="shootItem" :filter="['cacertificatevalidities-constraint']" small class="mr-1" />
          <span color="warning">Certificate Authorities will expire in less than one year</span>
        </template>
        <template v-else>
          <span v-if="!!lastCompletionTime">Last Rotated: <time-string :date-time="lastCompletionTime" mode="past"></time-string></span>
          <span v-else>Not yet rotated</span>
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
import compact from 'lodash/compact'
import { rotationTypes } from '@/utils/credentialsRotation'

export default {
  name: 'credential-tile',
  components: {
    RotateCredentials,
    TimeString,
    ShootMessages
  },
  props: {
    type: {
      type: String,
      default: 'allCredentials',
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
      return get(this.shootStatusCredentialsRotation, this.type, {})
    },
    lastInitiationTime () {
      if (this.type !== 'allCredentials') {
        return this.rotationStatus.lastInitiationTime
      }
      // Do not show aggregated initiation time
      return undefined
    },
    lastCompletionTime () {
      if (this.type !== 'allCredentials') {
        return this.rotationStatus.lastCompletionTime
      }
      const allCompletionTimes = compact(flatMap(this.shootStatusCredentialsRotation, 'lastCompletionTime')).sort()
      let requiredNumberOfRotationTimes = Object.keys(rotationTypes).length - 1 // There is no "all credentials" rotation type in the rotation status
      if (!this.shootEnableStaticTokenKubeconfig) {
        requiredNumberOfRotationTimes = requiredNumberOfRotationTimes - 1
      }

      if (requiredNumberOfRotationTimes === allCompletionTimes.length) {
        return head(allCompletionTimes)
      }
      return undefined
    },
    phase () {
      if (this.type === 'allCredentials') {
        return this.shootStatusCredentialsRotationAggregatedPhase
      }
      return this.rotationStatus.phase
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
    showChip () {
      return this.phaseType && this.phaseType !== 'Completed'
    },
    title () {
      return this.getRotationTitle(this.type)
    }
  },
  methods: {
    getRotationTitle (type) {
      return get(rotationTypes, [type, 'title'])
    }
  }
}
</script>
