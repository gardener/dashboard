<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-list-item>
    <v-list-item-icon>
      <v-badge icon="mdi-key-change" :color="color" overlap offset-y="6">
        <v-icon :color="color">{{icon}}</v-icon>
      </v-badge>
    </v-list-item-icon>
    <v-list-item-content>
      <v-list-item-title class="d-flex align-center">
        {{title}}
        <v-chip v-if="phase" :color="phaseColor" x-small class="rounded ml-1">{{phase}}</v-chip>
      </v-list-item-title>
      <slot name="subtitle">
        <v-list-item-subtitle>
          <span v-if="!!lastInitiationTime">Last Initiated: <time-string :date-time="lastInitiationTime" mode="past"></time-string></span>
          <span v-if="!!lastInitiationTime && !!lastCompletionTime"> / </span>
          <span v-if="!!lastCompletionTime">Last completed: <time-string :date-time="lastCompletionTime" mode="past"></time-string></span>
        </v-list-item-subtitle>
      </slot>
    </v-list-item-content>
    <v-list-item-action class="mx-0">
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
    icon: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    type: {
      type: String,
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
          return 'success'
        default:
          return 'grey'
      }
    }
  }
}
</script>
