<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <a
    :href="sanitizeUrl(url)"
    target="_blank"
    rel="noopener"
    class="text-decoration-none text-no-wrap"
  >
    <span class="text-decoration-underline">
      <slot>{{url}}</slot>
    </span>
    <v-icon
      :size="12"
      end
      icon="mdi-open-in-new"
      class="inherit-color"
    />
  </a>
</template>

<script>
import { defineComponent } from 'vue'
import { sanitizeUrl } from '@braintree/sanitize-url'

export default defineComponent({
  props: {
    url: {
      type: String,
      required: true,
    },
  },
  methods: {
    sanitizeUrl,
  },
})
</script>
