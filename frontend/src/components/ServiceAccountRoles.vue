<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div d-flex flex-row>
    <v-tooltip top v-for="{ displayName, notEditable, tooltip } in roleDisplayNames" :key="displayName" :disabled="!tooltip">
      <template v-slot:activator="{ on }">
        <v-chip v-on="on" class="mr-3" small :color="notEditable ? 'grey' : 'black'" outlined>
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
