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
  isCredentialsBinding,
  isSecretBinding,
  isSecret,
  isWorkloadIdentity,
} from '@/composables/credential/helper'

const props = defineProps({
  credentialEntity: Object,
  renderLink: Boolean,
})

const credential = toRef(props, 'credentialEntity')

const icon = computed(() => {
  if (isSecretBinding(credential.value)) {
    return 'mdi-key'
  }
  if (isCredentialsBinding(credential.value)) {
    if (credential.value.credentialsRef.kind === 'Secret') {
      return 'mdi-key-outline'
    }
    if (credential.value.credentialsRef.kind === 'WorkloadIdentity') {
      return 'mdi-id-card'
    }
  }
  if (isSecret(credential.value)) {
    return 'mdi-key'
  }
  if (isWorkloadIdentity(credential.value)) {
    return 'mdi-id-card'
  }
  return 'mdi-help-circle'
})

const tooltip = computed(() => {
  if (isSecretBinding(credential.value)) {
    return 'Secret (SecretBinding)'
  }
  if (isCredentialsBinding(credential.value)) {
    return `${credential.value.credentialsRef.kind} (${credential.value.kind})`
  }
  if (isSecret(credential.value)) {
    return 'Secret'
  }
  if (isWorkloadIdentity(credential.value)) {
    return 'Workload Identity'
  }
  return 'Unknown credential binding type'
})

</script>
