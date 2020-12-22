<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div v-if="!isMaintenancePreconditionSatisfied" :class="{ 'd-flex' : icon }">
    <v-tooltip v-if="icon" max-width="800px" top>
      <template v-slot:activator="{ on: tooltip }">
        <v-icon
        v-on="tooltip"
        :small="small"
        class="pr-1"
        color="warning"
        >mdi-alert-circle-outline</v-icon>
      </template>
      <div>Maintenance precondition check failed: It may not be safe to start maintenance for your cluster due to the following reason:</div>
      <div>{{maintenancePreconditionSatisfiedMessage}}</div>
    </v-tooltip>
    <v-alert v-else type="warning" outlined>
      <div class="font-weight-bold">Maintenance precondition check failed: It may not be safe to start maintenance for your cluster due to the following reason:</div>
      <div>{{maintenancePreconditionSatisfiedMessage}}</div>
    </v-alert>
  </div>
</template>

<script>
export default {
  name: 'maintenanceConstraintWarning',
  props: {
    isMaintenancePreconditionSatisfied: {
      type: Boolean
    },
    maintenancePreconditionSatisfiedMessage: {
      type: String
    },
    icon: {
      type: Boolean
    },
    small: {
      type: Boolean
    }
  }
}
</script>
