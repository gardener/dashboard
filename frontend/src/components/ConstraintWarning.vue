<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div v-if="value" :class="{ 'd-flex' : icon }">
    <v-tooltip v-if="icon" max-width="800px" top>
      <template v-slot:activator="{ on: tooltip }">
        <v-icon
        v-on="tooltip"
        :small="small"
        class="pr-1"
        color="warning"
        >mdi-alert-circle-outline</v-icon>
      </template>
      <div>{{constraintTitle}}</div>
      <div>{{constraintMessage}}</div>
    </v-tooltip>
    <v-alert v-else type="warning" outlined>
      <div class="font-weight-bold">{{constraintTitle}}</div>
      <div>{{constraintMessage}}</div>
    </v-alert>
  </div>
</template>

<script>
export default {
  name: 'ConstraintWarning',
  props: {
    value: {
      type: Boolean
    },
    constraintType: {
      type: String
    },
    constraintMessage: {
      type: String
    },
    icon: {
      type: Boolean
    },
    small: {
      type: Boolean
    }
  },
  computed: {
    constraintTitle () {
      switch (this.constraintType) {
        case 'hibernation':
          return 'Your hibernation schedule may not have any effect:'
        case 'maintenance':
          return 'Maintenance precondition check failed: It may not be safe to start maintenance for your cluster due to the following reason:'
        default:
          return undefined
      }
    }
  }
}
</script>
