<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip location="top">
    <template #activator="{ props: tProps }">
      <v-icon
        v-bind="tProps"
        size="small"
        class="mr-2"
      >
        {{ icon }}
      </v-icon>
    </template>
    <span>{{ tooltip }}</span>
  </v-tooltip>
</template>

<script setup>
import {
  computed,
  toRef,
} from 'vue'

import {
  isCredentialsBinding,
  isSecretBinding,
} from '@/composables/credential/helper'

const props = defineProps({
  binding: Object,
  renderLink: Boolean,
})

const binding = toRef(props, 'binding')

const icon = computed(() => {
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
  return 'mdi-help-circle'
})

const tooltip = computed(() => {
  if (isSecretBinding(binding.value)) {
    return 'Secret (SecretBinding)'
  }
  if (isCredentialsBinding(binding.value)) {
    return `${binding.value.credentialsRef.kind} (${binding.value.kind})`
  }
  return 'Unknown credential binding type'
})

</script>
