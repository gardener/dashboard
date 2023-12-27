<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <router-link
    v-if="canLinkToSecret"
    class="text-anchor"
    :to="{ name: 'Secret', params: { name: secretBindingName, namespace: namespace } }"
  >
    <span>{{ secretBindingName }}</span>
  </router-link>
  <span v-else>{{ secretBindingName }}</span>
</template>

<script>
export default {
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
