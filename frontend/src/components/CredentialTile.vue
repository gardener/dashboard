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
        <v-chip v-if="phase" :color="phaseColor" label x-small class="ml-2" outlined>{{phase}}</v-chip>
      </v-list-item-title>
      <v-list-item-subtitle class="d-flex align-center">
        <template v-if="type==='certificateAuthorities' && !isCACertificateValiditiesAcceptable">
          <shoot-messages :shoot-item="shootItem" :filter="['cacertificatevalidities-constraint']" small class="mr-1" />
          <span color="warning">Certificate Authorities will expire in less than one year</span>
        </template>
        <template v-else>
          <span v-if="!!lastInitiationTime">Last Initiated: <time-string :date-time="lastInitiationTime" mode="past"></time-string></span>
          <span v-if="!!lastInitiationTime && !!lastCompletionTime"> / </span>
          <span v-if="!!lastCompletionTime">Last completed: <time-string :date-time="lastCompletionTime" mode="past"></time-string></span>
        </template>
      </v-list-item-subtitle>
    </v-list-item-content>
    <v-list-item-action :class="{'py-0 my-0' : dense}">
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
import last from 'lodash/last'

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
      return last(flatMap(this.shootStatusCredentialRotation, 'lastInitiationTime').sort())
    },
    lastCompletionTime () {
      if (this.type) {
        return this.rotationStatus.lastCompletionTime
      }
      return last(flatMap(this.shootStatusCredentialRotation, 'lastCompletionTime').sort())
    },
    phase () {
      if (this.type) {
        return this.rotationStatus.phase
      }
      return this.shootStatusCredentialRotationAggregatedPhase
    },
    phaseColor () {
      switch (this.phase) {
        case 'Preparing':
        case 'Completing':
          return 'info'
        case 'Prepared':
        case 'Completed':
          return 'primary'
        default:
          return 'warning'
      }
    },
    iconColor () {
      if (!this.isCACertificateValiditiesAcceptable) {
        return 'warning'
      }
      return 'primary'
    }
  }
}
</script>
