<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-list-item :dense="dense">
    <v-list-item-icon>
      <v-icon v-if="!dense" :color="color">mdi-key-change</v-icon>
    </v-list-item-icon>
    <v-list-item-content :class="{'py-0 my-0' : dense}">
      <v-list-item-title class="d-flex align-center">
        {{title}}
        <v-chip v-if="phase" :color="phaseColor" label x-small class="ml-2" outlined>{{phase}}</v-chip>
      </v-list-item-title>
      <slot name="subtitle">
        <v-list-item-subtitle>
          <span v-if="!!lastInitiationTime">Last Initiated: <time-string :date-time="lastInitiationTime" mode="past"></time-string></span>
          <span v-if="!!lastInitiationTime && !!lastCompletionTime"> / </span>
          <span v-if="!!lastCompletionTime">Last completed: <time-string :date-time="lastCompletionTime" mode="past"></time-string></span>
        </v-list-item-subtitle>
      </slot>
    </v-list-item-content>
    <v-list-item-action :class="{'py-0 my-0' : dense}">
      <rotate-credentials :shoot-item="shootItem" :type="type"></rotate-credentials>
    </v-list-item-action>
  </v-list-item>
</template>

<script>
import RotateCredentials from '@/components/RotateCredentials'
import TimeString from '@/components/TimeString'
import { shootItem } from '@/mixins/shootItem'
import get from 'lodash/get'
import flatMap from 'lodash/flatMap'
import head from 'lodash/head'

export default {
  components: {
    RotateCredentials,
    TimeString
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
    },
    color: {
      type: String,
      default: 'primary'
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
      return head(flatMap(this.shootStatusCredentialRotation, 'lastInitiationTime').sort())
    },
    lastCompletionTime () {
      if (this.type) {
        return this.rotationStatus.lastCompletionTime
      }
      return head(flatMap(this.shootStatusCredentialRotation, 'lastCompletionTime').sort())
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
    }
  }
}
</script>
