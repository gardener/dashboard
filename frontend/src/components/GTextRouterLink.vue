<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <router-link
    v-slot="{ href, navigate }"
    v-bind="$props"
    custom
  >
    <a
      v-bind="$attrs"
      :href="href"
      class="text-anchor"
      @click.stop="navigate"
      v-text="text"
    />
  </router-link>
</template>

<script>
import { RouterLink } from 'vue-router'

export default {
  inheritAttrs: false,
  props: {
    ...RouterLink.props,
    text: {
      type: String,
      required: true,
    },
  },
}
</script>
