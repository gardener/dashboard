<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div>
    <v-tooltip location="top" v-for="({ displayName, notEditable, tooltip }, index) in roleDisplayNames" :key="displayName" :disabled="!tooltip">
      <template v-slot:activator="{ on }">
        <v-chip v-on="on" :disabled="notEditable" small color="action-button" variant="outlined" :class="{'ml-3': index > 0}">
          {{displayName}}
        </v-chip>
      </template>
      <span>{{tooltip}}</span>
    </v-tooltip>
  </div>
</template>

<script>
export default {
  name: 'role-display-names',
  props: {
    roleDisplayNames: {
      type: Array,
      required: true
    }
  }
}
</script>
