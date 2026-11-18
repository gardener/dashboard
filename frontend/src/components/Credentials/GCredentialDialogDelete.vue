<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-dialog
    v-model="visible"
    max-width="800"
    :persistent="loading"
  >
    <v-card>
      <g-toolbar
        prepend-icon="mdi-alert-outline"
        title="Confirm Delete"
      />
      <v-card-text>
        <v-container fluid>
          <span class="text-body-large">
            <template v-if="deletesCredentialWithBinding">
              Are you sure you want to delete <span class="font-weight-bold">{{ credentialName }}</span> and its associated <code>{{ resourceKind }}</code>?
            </template>
            <template v-else-if="binding">
              Are you sure you want to delete the <code>{{ resourceKind }}</code> <span class="font-weight-bold">{{ resourceName }}</span>?
            </template>
            <template v-else>
              Are you sure you want to delete <span class="font-weight-bold">{{ resourceName }}</span>?
            </template>
            <br>
            <span class="text-error font-weight-bold">The operation cannot be undone.</span>
          </span>
        </v-container>
        <g-message
          v-model:message="errorMessage"
          v-model:detailed-message="detailedErrorMessage"
          color="error"
        />
      </v-card-text>
      <v-alert
        v-if="preserveCredential"
        type="info"
        variant="tonal"
        class="mx-6 mb-4"
      >
        <p>
          The Secret <code>{{ credentialName }}</code> is also referenced by
        </p>
        <v-chip
          v-for="{ kind, metadata } in bindingsWithSameCredential"
          :key="metadata.uid"
          v-tooltip:top="kind"
          class="mr-2"
          size="small"
          :prepend-icon="kind === 'SecretBinding' ? 'mdi-key' : 'mdi-key-outline'"
        >
          {{ metadata.name }}
        </v-chip>
        <p class="mt-2 mb-0">
          Only this <code>{{ resourceKind }}</code> will be deleted. The Secret will be preserved.
        </p>
      </v-alert>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="loading"
          @click="visible = false"
        >
          Cancel
        </v-btn>
        <v-btn
          variant="text"
          color="toolbar-background"
          :loading="loading"
          :disabled="loading"
          @click="onDelete"
        >
          Delete
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import {
  computed,
  inject,
  ref,
  toRef,
  watch,
} from 'vue'

import { useCredentialStore } from '@/store/credential'

import GMessage from '@/components/GMessage.vue'
import GToolbar from '@/components/GToolbar.vue'

import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'
import { useDnsProviderCredential } from '@/composables/credential/useDnsProviderCredential'

import { errorDetailsFromError } from '@/utils/error'

const props = defineProps({
  credential: Object,
  binding: Object,
})

const visible = defineModel({
  type: Boolean,
  required: true,
})

const logger = inject('logger')
const credentialStore = useCredentialStore()
const credential = toRef(props, 'credential')
const binding = toRef(props, 'binding')
const composable = binding.value
  ? useCloudProviderBinding(binding)
  : useDnsProviderCredential(credential)

const {
  bindingsWithSameCredential,
  credentialName,
  isOrphanedBinding,
  resourceKind,
  resourceName,
  resourceNamespace,
} = composable

const detailedErrorMessage = ref()
const errorMessage = ref()
const loading = ref(false)

const preserveCredential = computed(() => {
  return Boolean(binding.value && bindingsWithSameCredential?.value?.length)
})

const deletesCredentialWithBinding = computed(() => {
  return Boolean(binding.value && !isOrphanedBinding?.value && !preserveCredential.value)
})

watch(visible, value => {
  if (value) {
    reset()
  }
})

async function onDelete () {
  if (loading.value) {
    return
  }
  loading.value = true
  try {
    if (credential.value) {
      await credentialStore.deleteDnsCredential({
        credentialKind: resourceKind.value,
        credentialNamespace: resourceNamespace.value,
        credentialName: resourceName.value,
      })
    } else {
      await credentialStore.deleteInfraCredential({
        bindingKind: resourceKind.value,
        bindingNamespace: resourceNamespace.value,
        bindingName: resourceName.value,
        preserveCredential: preserveCredential.value,
      })
    }
    visible.value = false
  } catch (err) {
    const details = errorDetailsFromError(err)
    errorMessage.value = `Failed to delete ${binding.value ? 'credential binding' : 'Secret'}.`
    detailedErrorMessage.value = details.detailedMessage
    logger.error(errorMessage.value, details.errorCode, details.detailedMessage, err)
  } finally {
    loading.value = false
  }
}

function reset () {
  errorMessage.value = undefined
  detailedErrorMessage.value = undefined
}
</script>
