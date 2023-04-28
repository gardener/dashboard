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
        <v-tooltip location="top">
          <template v-slot:activator="{ on }">
            <span v-on="on">{{title}}</span>
          </template>
          {{titleTooltip}}
        </v-tooltip>
        <v-tooltip location="top">
          <template v-slot:activator="{ on }">
            <v-chip v-on="on" v-if="showChip" :color="phaseColor" label x-small class="ml-2" variant="outlined">{{phaseCaption}}</v-chip>
          </template>
          <template v-if="phaseType === 'Prepared'">
            <template v-if="phase && phase.incomplete">
              <div>
                <strong>
                  All two-step credential rotations need to be in phase
                  <v-chip color="primary" label x-small class="ml-2">Prepared</v-chip>
                  in order to perform this operation
                </strong>
              </div>
              <div>Please prepare rotation of the following credentials</div>
              <ul v-if="phase">
                <li v-for="{title} in phase.unpreparedRotations" :key="title">{{title}}</li>
              </ul>
            </template>
            <template v-else>
              <div>
                This two-step operation is in phase
                <v-chip color="primary" label x-small class="ml-2">Prepared</v-chip>
              </div>
              <div v-if="!!lastInitiationTime">
                Rotation Prepared: <time-string :date-time="lastInitiationTime" mode="past" no-tooltip></time-string>
              </div>
            </template>
          </template>
          <span v-else-if="isProgressing">
            This operation is currently running
          </span>
          <span v-else>{{phaseCaption}}</span>
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
import RotateCredentials from '@/components/RotateCredentials.vue'
import TimeString from '@/components/TimeString.vue'
import ShootMessages from '@/components/ShootMessages/ShootMessages.vue'
import shootStatusCredentialRotation from '@/mixins/shootStatusCredentialRotation'
import get from 'lodash/get'

export default {
  name: 'credential-tile',
  components: {
    RotateCredentials,
    TimeString,
    ShootMessages
  },
  props: {
    dense: {
      type: Boolean,
      required: false
    }
  },
  mixins: [shootStatusCredentialRotation],
  computed: {
    isProgressing () {
      return this.phaseType === 'Preparing' || this.phaseType === 'Completing' || this.phaseType === 'Rotating'
    },
    phaseCaption () {
      return get(this.phase, 'caption', this.phaseType)
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
      return this.rotationType?.title
    },
    titleTooltip () {
      return this.rotationType?.twoStep ? 'Two-step rotation' : 'One-step rotation'
    }
  }
}
</script>
