<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-text-router-link
    v-if="canLinkToSecret"
    :to="{ name: 'Secret', params: { name: secretBindingName, namespace: namespace } }"
    :text="secretBindingName"
  />
  <span v-else>{{ secretBindingName }}</span>
</template>

<script>
import GTextRouterLink from '@/components/GTextRouterLink.vue'

export default {
  components: {
    GTextRouterLink,
  },
  props: {
    namespace: {
      type: String,
    },
    secretBindingName: {
      type: String,
    },
  },
  computed: {
    canLinkToSecret () {
      return this.secretBindingName && this.namespace
    },
  },
}
</script>
