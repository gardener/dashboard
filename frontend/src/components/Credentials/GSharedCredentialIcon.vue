<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-icon
    v-tooltip:top="`This credential is shared from the ${namespace} namespace`"
    size="small"
    class="ml-2"
  >
    mdi-account-arrow-left
  </v-icon>
</template>

<script setup>

import { toRef } from 'vue'

const props = defineProps({
  namespace: {
    type: String,
    required: true,
  },
})
const namespace = toRef(props, 'namespace')

</script>
