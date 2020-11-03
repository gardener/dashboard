<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-row v-for="{ key, title, description, options } in selectedAccessRestrictions" :key="key" class="mx-0 mb-1">
      <v-tooltip
        top
        :disabled="!description"
        max-width="600px"
      >
        <template v-slot:activator="{ on }">
          <v-chip
            v-on="on"
            small
            outlined
            color="cyan darken-2"
            class="mr-2 mb-1"
          >{{title}}</v-chip>
        </template>
        {{description}}
      </v-tooltip>
      <v-tooltip
        v-for="{ key: optionsKey, title, description } in options"
        :key="`${key}_${optionsKey}`"
        top
        :disabled="!description"
        max-width="600px"
      >
        <template v-slot:activator="{ on }">
          <v-chip
            v-on="on"
            small
            outlined
            color="cyan darken-2"
            class="mr-2"
          >{{title}}</v-chip>
        </template>
        {{description}}
      </v-tooltip>
    </v-row>
  </div>
</template>

<script>

export default {
  props: {
    selectedAccessRestrictions: {
      type: Array
    }
  }
}
</script>

<style lang="scss" scoped>

</style>
