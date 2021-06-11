<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <a :href="url" target="_blank">
    <span><slot>{{url}}</slot></span> <v-icon  style="font-size: 80%">mdi-open-in-new</v-icon>
  </a>
</template>

<script>

export default {
  name: 'external-link',
  props: {
    url: {
      type: String,
      required: true
    }
  }
}
</script>

<style scoped>
  a {
    text-decoration: none;
  }
  a > span {
    text-decoration-line: underline;
  }
</style>
