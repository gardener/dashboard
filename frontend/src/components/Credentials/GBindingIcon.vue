<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex align-center">
    <v-icon
      v-tooltip:top="tooltip"
      size="small"
      class="mr-2"
      :color="isSecretBinding ? 'warning' : undefined"
    >
      {{ icon }}
    </v-icon>
    <template v-if="isSecretBinding && showMigrationStatus">
      <div v-if="credentialsBindingNamesForSecretBinding.length > 0">
        <v-icon
          v-if="credentialUsageCount === 0"
          icon="mdi-information-outline"
          color="success"
          class="mr-2"
        />
        <v-icon
          v-else
          icon="mdi-alert-circle-outline"
          color="warning"
          class="mr-2"
        />
        <v-tooltip
          location="top"
          activator="parent"
        >
          <p class="font-weight-bold text-warning">
            SecretBindings are deprecated and unsupported in Kubernetes 1.34 or later
          </p>
          <p>
            <v-icon
              size="x-small"
              icon="mdi-check"
            />
            This Secret is referenced by {{ credentialsBindingNamesForSecretBinding.length }} CredentialsBinding{{ credentialsBindingNamesForSecretBinding.length === 1 ? '' : 's' }}:
          </p>
          <div class="list-style">
            <ul class="pl-4">
              <li
                v-for="bindingName in credentialsBindingNamesForSecretBinding"
                :key="bindingName"
              >
                <pre>{{ bindingName }}</pre>
              </li>
            </ul>
          </div>
          <p v-if="credentialUsageCount === 0">
            <v-icon
              size="x-small"
              icon="mdi-check"
            />
            No clusters are currently using this deprecated binding. You can safely delete it
          </p>
          <template v-else>
            <p>
              <v-icon
                size="x-small"
                icon="mdi-alert-outline"
              />
              {{ credentialUsageCount }} cluster{{ credentialUsageCount === 1 ? '' : 's' }} still use{{ credentialUsageCount === 1 ? 's' : '' }} this deprecated binding
            </p>
            <p>
              <v-icon
                size="x-small"
                icon="mdi-arrow-right"
              />
              Please update those clusters to use a CredentialsBinding before deleting it
            </p>
          </template>
        </v-tooltip>
      </div>
      <div v-else>
        <v-btn
          icon="mdi-key-change"
          color="primary"
          variant="tonal"
          size="small"
          class="mr-2"
          density="comfortable"
          @click="migrationDialogVisible = true"
        />
        <v-tooltip
          location="top"
          activator="parent"
        >
          <p class="font-weight-bold text-warning">
            SecretBindings are deprecated and unsupported in Kubernetes 1.34 or later
          </p>
          <p>
            <v-icon
              size="x-small"
              icon="mdi-alert-outline"
            />
            This Secret is currently not referenced by any CredentialsBindings
          </p>
          <template v-if="credentialUsageCount === 0">
            <p>
              <v-icon
                size="x-small"
                icon="mdi-check"
              />
              No clusters are currently using this deprecated binding
            </p>
            <p>
              <v-icon
                size="x-small"
                icon="mdi-arrow-right"
              />
              You can delete it if you don't need it
            </p>
          </template>
          <p v-else>
            <v-icon
              size="x-small"
              icon="mdi-alert-outline"
            />
            {{ credentialUsageCount }} cluster{{ credentialUsageCount === 1 ? '' : 's' }} currently use{{ credentialUsageCount === 1 ? 's' : '' }} this deprecated binding
          </p>
          <p>
            <v-icon
              size="x-small"
              icon="mdi-arrow-right"
            />
            Click to review the migration steps and create a CredentialsBinding for this Secret
          </p>
        </v-tooltip>
      </div>
    </template>
  </div>
  <g-secret-dialog-migration
    v-if="migrationDialogVisible"
    v-model="migrationDialogVisible"
    :binding="binding"
  />
</template>

<script setup>
import {
  computed,
  ref,
  toRefs,
} from 'vue'

import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'

import GSecretDialogMigration from './GSecretDialogSBMigration.vue'

const props = defineProps({
  binding: Object,
  showMigrationStatus: Boolean,
})

const { binding, showMigrationStatus } = toRefs(props)
const migrationDialogVisible = ref(false)

const {
  isSecretBinding,
  isCredentialsBinding,
  bindingsWithSameCredential,
  credentialUsageCount,
} = useCloudProviderBinding(binding)

const icon = computed(() => {
  if (isSecretBinding.value) {
    return 'mdi-key-alert'
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

const credentialsBindingNamesForSecretBinding = computed(() => {
  if (!isSecretBinding.value) {
    return []
  }
  return bindingsWithSameCredential.value
    .filter(binding => binding.kind === 'CredentialsBinding')
    .map(binding => binding.metadata.name)
})

</script>

<style scoped>

.list-style {
  ul {
    margin-left: 10px;
  }
  li {
    margin-left: 10px;
  }
}

</style>
