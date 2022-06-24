<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-list-item>
    <v-list-item-icon>
      <v-badge icon="mdi-key-change" overlap offset-y="6">
        <v-icon color="primary">{{icon}}</v-icon>
      </v-badge>
    </v-list-item-icon>
    <v-list-item-content>
      <v-list-item-title>
        {{title}}
      </v-list-item-title>
      <v-list-item-subtitle>
        <span v-if="!!lastInitiationTime">Last Initiated: <time-string :date-time="lastInitiationTime" mode="past"></time-string></span>
        <span v-if="!!lastInitiationTime && !!lastCompletionTime"> / </span>
        <span v-if="!!lastCompletionTime">Last completed: <time-string :date-time="lastCompletionTime" mode="past"></time-string></span>
      </v-list-item-subtitle>
    </v-list-item-content>
    <v-list-item-action class="mx-0">
      <rotate-credentials :shoot-item="shootItem" :operation="initOperation" :phase="phase" :mode="completionOperation ? 'init' : 'rotate'"></rotate-credentials>
    </v-list-item-action>
    <v-list-item-action v-if="completionOperation" class="mx-0">
      <rotate-credentials :shoot-item="shootItem" :operation="completionOperation" :phase="phase" mode="complete"></rotate-credentials>
    </v-list-item-action>
  </v-list-item>
</template>

<script>
import RotateCredentials from '@/components/RotateCredentials'
import TimeString from '@/components/TimeString'

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
    lastInitiationTime: {
      type: String,
      required: false
    },
    lastCompletionTime: {
      type: String,
      required: false
    },
    shootItem: {
      type: Object,
      required: true
    },
    initOperation: {
      type: String,
      required: true
    },
    completionOperation: {
      type: String,
      required: false
    },
    phase: {
      type: String,
      required: false
    }
  }
}
</script>
