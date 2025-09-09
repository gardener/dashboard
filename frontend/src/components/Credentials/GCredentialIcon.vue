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

const credentialEntity = toRef(props, 'credentialEntity')

const icon = computed(() => {
  if (isSecretBinding(credentialEntity.value)) {
    return 'mdi-key'
  }
  if (isCredentialsBinding(credentialEntity.value)) {
    if (credentialEntity.value.credentialsRef.kind === 'Secret') {
      return 'mdi-key-outline'
    }
    if (credentialEntity.value.credentialsRef.kind === 'WorkloadIdentity') {
      return 'mdi-id-card'
    }
  }
  if (isSecret(credentialEntity.value)) {
    return 'mdi-key'
  }
  if (isWorkloadIdentity(credentialEntity.value)) {
    return 'mdi-id-card'
  }
  return 'mdi-help-circle'
})

const tooltip = computed(() => {
  if (isSecretBinding(credentialEntity.value)) {
    return 'Secret (SecretBinding)'
  }
  if (isCredentialsBinding(credentialEntity.value)) {
    return `${credentialEntity.value.credentialsRef.kind} (${credentialEntity.value.kind})`
  }
  if (isSecret(credentialEntity.value)) {
    return 'Secret'
  }
  if (isWorkloadIdentity(credentialEntity.value)) {
    return 'Workload Identity'
  }
  return 'Unknown credential binding type'
})

</script>
