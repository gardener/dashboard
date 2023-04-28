<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <div v-for="{ key, title, description, options } in selectedAccessRestrictions" :key="key" class="d-flex">
      <v-tooltip
        location="top"
        :disabled="!description"
        max-width="600px"
      >
        <template v-slot:activator="{ on }">
          <v-chip
            v-on="on"
            small
            variant="outlined"
            color="primary"
            class="mr-2 my-0"
          >{{title}}</v-chip>
        </template>
        <section v-html="transformHtml(description)"/>
      </v-tooltip>
      <v-tooltip
        v-for="{ key: optionsKey, title, description } in options"
        :key="`${key}_${optionsKey}`"
        location="top"
        :disabled="!description"
        max-width="600px"
      >
        <template v-slot:activator="{ on }">
          <v-chip
            v-on="on"
            small
            variant="outlined"
            color="primary"
            class="mr-2"
          >{{title}}</v-chip>
        </template>
        <section v-html="transformHtml(description)"/>
      </v-tooltip>
    </div>
  </div>
</template>

<script>

import { transformHtml } from '@/utils'

export default {
  props: {
    selectedAccessRestrictions: {
      type: Array
    }
  },
  methods: {
    transformHtml (value) {
      return transformHtml(value)
    }
  }
}
</script>

<style lang="scss" scoped>
  section {
    /*  TODO: this was "::v-deep > p" before. Check if the new version below, after compile, is actually equivalent */
    :deep(> p) {
      margin: 0;
    }
  }
</style>
