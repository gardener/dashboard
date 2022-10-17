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
        <v-tooltip top :disabled="phase.type !== 'Prepared'">
          <template v-slot:activator="{ on }">
            <v-chip v-on="on" v-if="showChip" :color="phaseColor" label x-small class="ml-2" outlined>{{phaseCaption}}</v-chip>
          </template>
          <template v-if="phase && phase.incomplete">
            <div>
              <strong>
                All two-step credentials rotations need to be in phase
                <v-chip color="primary" label x-small class="ml-2">Prepared</v-chip>
                in order to perform this operation
              </strong>
            </div>
            <div>Please prepare rotation of the followig credentials</div>
            <ul v-if="phase">
              <li v-for="{title} in phase.unpreparedRotations" :key="title">{{title}}</li>
            </ul>
          </template>
          <template v-else>
            <div>
              This two-step operation is in phase
              <v-chip color="primary" label x-small class="ml-2">Prepared</v-chip>
            </div>
            <div>
              Rotation Prepared: <time-string :date-time="lastInitiationTime" mode="past"></time-string>
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
import filter from 'lodash/filter'
import find from 'lodash/find'
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
      const allCompletionTimestamps = compact(flatMap(this.shootStatusCredentialsRotation, 'lastCompletionTime')).sort()
      let requiredNumberOfRotationTimestamps = filter(rotationTypes, 'type').length // only consider rotations that have an rotation status type
      if (!this.shootEnableStaticTokenKubeconfig) {
        requiredNumberOfRotationTimestamps = requiredNumberOfRotationTimestamps - 1
      }

      if (requiredNumberOfRotationTimestamps === allCompletionTimestamps.length) {
        return head(allCompletionTimestamps)
      }
      return undefined
    },
    phase () {
      if (!this.type) {
        return this.shootStatusCredentialsRotationAggregatedPhase
      }
      const type = this.rotationStatus.phase
      return {
        type
      }
    },
    phaseCaption () {
      return get(this.phase, 'caption', this.phase.type)
    },
    phaseColor () {
      switch (this.phase.type) {
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
      return this.phase.type && this.phase.type !== 'Completed'
    },
    title () {
      return this.getRotationTitle(this.type)
    }
  },
  methods: {
    getRotationTitle (type) {
      return get(find(rotationTypes, t => { return t.type === this.type }), 'title')
    }
  }
}
</script>
