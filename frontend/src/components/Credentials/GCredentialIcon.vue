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
  toRefs,
} from 'vue'

import {
  isCredentialsBinding,
  isSecretBinding,
  isSecret,
  isWorkloadIdentity,
} from '@/composables/credential/helper'

const props = defineProps({
  credential: Object,
  binding: Object,
})

const { credential, binding } = toRefs(props)

const icon = computed(() => {
  if (binding?.value) {
    if (isSecretBinding(binding.value)) {
      return 'mdi-key'
    }
    if (isCredentialsBinding(binding.value)) {
      if (binding.value.credentialsRef.kind === 'Secret') {
        return 'mdi-key-outline'
      }
      if (binding.value.credentialsRef.kind === 'WorkloadIdentity') {
        return 'mdi-id-card'
      }
    }
  }
  if (credential?.value) {
    if (isSecret(credential.value)) {
      return 'mdi-key'
    }
    if (isWorkloadIdentity(credential.value)) {
      return 'mdi-id-card'
    }
  }
  return 'mdi-help-circle'
})

const tooltip = computed(() => {
  if (binding?.value) {
    if (isSecretBinding(binding.value)) {
      return 'Secret (SecretBinding)'
    }
    if (isCredentialsBinding(binding.value)) {
      return `${binding.value.credentialsRef.kind} (${binding.value.kind})`
    }
  }
  if (credential?.value) {
    if (isSecret(credential.value)) {
      return 'Secret'
    }
    if (isWorkloadIdentity(credential.value)) {
      return 'Workload Identity'
    }
  }
  return 'Unknown credential binding type'
})

</script>
