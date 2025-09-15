<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-icon
    v-tooltip:top="tooltip"
    size="small"
    class="mr-2"
  >
    {{ icon }}
  </v-icon>
</template>

<script setup>
import {
  computed,
  toRef,
} from 'vue'

import {
  isSecret,
  isWorkloadIdentity,
} from '@/composables/credential/helper'

const props = defineProps({
  credential: Object,
})

const credential = toRef(props, 'credential')

const icon = computed(() => {
  if (isSecret(credential.value)) {
    return 'mdi-key'
  }
  if (isWorkloadIdentity(credential.value)) {
    return 'mdi-id-card'
  }
  return 'mdi-help-circle'
})

const tooltip = computed(() => {
  if (isSecret(credential.value)) {
    return 'Secret'
  }
  if (isWorkloadIdentity(credential.value)) {
    return 'Workload Identity'
  }
  return 'Unknown credential type'
})

</script>
