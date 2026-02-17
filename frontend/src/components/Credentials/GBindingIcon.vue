<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-icon
    v-tooltip:top="tooltip"
    size="small"
    class="mr-2"
    :color="isSecretBinding ? 'warning' : undefined"
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
  isCredentialsBinding as _isCredentialsBinding,
  isSecretBinding as _isSecretBinding,
} from '@/composables/credential/helper'

const props = defineProps({
  binding: Object,
})

const binding = toRef(props, 'binding')

const isSecretBinding = computed(() => _isSecretBinding(binding.value))
const isCredentialsBinding = computed(() => _isCredentialsBinding(binding.value))

const icon = computed(() => {
  if (isSecretBinding.value) {
    return 'mdi-key'
  }
  if (isCredentialsBinding.value) {
    if (binding.value.credentialsRef.kind === 'Secret') {
      return 'mdi-key-outline'
    }
    if (binding.value.credentialsRef.kind === 'WorkloadIdentity') {
      return 'mdi-id-card'
    }
  }
  return 'mdi-help-circle'
})

const tooltip = computed(() => {
  if (isSecretBinding.value) {
    return 'Secret (SecretBinding | Deprecated)'
  }
  if (isCredentialsBinding.value) {
    return `${binding.value.credentialsRef.kind} (${binding.value.kind})`
  }
  return 'Unknown binding type'
})

</script>
