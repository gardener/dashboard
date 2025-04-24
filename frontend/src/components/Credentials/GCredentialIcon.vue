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
        {{ credentialIcon.icon }}
      </v-icon>
    </template>
    <span>{{ credentialIcon.tooltip }}</span>
  </v-tooltip>
</template>

<script setup>
import {
  computed,
  toRef,
} from 'vue'

const props = defineProps({
  binding: Object,
  renderLink: Boolean,
})

const binding = toRef(props, 'binding')

const credentialIcon = computed(() => {
  const credentialIcon = {
    icon: 'mdi-help-circle',
    tooltip: 'Unknown',
  }
  if (binding.value._isSecretBinding) {
    credentialIcon.tooltip = 'Secret (SecretBinding)'
    credentialIcon.icon = 'mdi-key'
  }
  if (binding.value._isCredentialsBinding) {
    if (binding.value.credentialsRef.kind === 'Secret') {
      credentialIcon.tooltip = 'Secret (CredentialsBinding)'
      credentialIcon.icon = 'mdi-key-outline'
    }
    if (binding.value.credentialsRef.kind === 'WorkloadIdentity') {
      credentialIcon.tooltip = 'WorkloadIdentity'
      credentialIcon.icon = 'mdi-id-card'
    }
  }
  return credentialIcon
})

</script>
