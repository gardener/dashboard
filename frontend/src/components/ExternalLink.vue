<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <a :href="sanitizeUrl(url)" target="_blank" rel="noopener" class="underline">
    <span class="underline-text">
      <slot>{{url}}</slot>
    </span>
    <v-icon :size="12" class="inherit-color ml-1">mdi-open-in-new</v-icon>
  </a>
</template>

<script>
import sanitizeUrl from '@/mixins/sanitizeUrl'

export default {
  name: 'external-link',
  mixins: [sanitizeUrl],
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
    text-decoration: none !important;
    white-space: nowrap;
  }
  .underline-text {
    text-decoration: underline !important;
  }

</style>
