<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-dialog
    v-model="visible"
    max-width="1000"
  >
    <v-card>
      <g-toolbar
        prepend-icon="mdi-key-change"
        :title="`Create CredentialsBinding for Secret ${secretName}`"
      />
      <v-card-text>
        <v-container fluid>
          <p class="font-weight-bold mb-2">
            SecretBindings are deprecated and unsupported in Kubernetes 1.34 or later
          </p>
          <p>
            To continue using the Secret <code>{{ secretName }}</code> in your cluster, you need a CredentialsBinding.
            You can use the button below to automatically create a CredentialsBinding that references the same Secret.
          </p>
          <p>
            After the CredentialsBinding has been created, update your cluster to reference the new CredentialsBinding instead of the deprecated SecretBinding.
            You can change the referenced binding on the cluster details page.
            Repeat this for all clusters currently using the deprecated SecretBinding to ensure uninterrupted access to the Secret <code>{{ secretName }}</code>.
          </p>
          <p>
            After updating your clusters, you can safely delete the deprecated SecretBinding.
          </p>
          <p>
            More information:
            <g-external-link url="https://github.com/gardener/gardener/blob/master/docs/usage/shoot-operations/secretbinding-to-credentialsbinding-migration.md">
              SecretBinding to CredentialsBinding Migration
            </g-external-link>
          </p>
          <div
            class="mt-3"
            style="overflow-y: scroll"
          >
            <div class="d-flex align-center">
              <div class="d-flex align-center">
                <v-chip
                  v-tooltip:top="'Secret referenced by the deprecated SecretBinding'"
                  tile
                  color="primary"
                >
                  {{ secretName }}
                  <v-chip
                    v-tooltip:top="`Namespace: ${secretNamespace}`"
                    size="x-small"
                    color="primary"
                    class="ml-2"
                  >
                    Secret
                  </v-chip>
                </v-chip>
                <v-icon class="mx-2">
                  mdi-arrow-left
                </v-icon>
              </div>
              <div class="d-flex flex-column">
                <v-chip
                  v-tooltip:top="`Used by ${secretUsageCount} cluster${secretUsageCount === 1 ? '' : 's'}`"
                  tile
                  color="primary"
                  class="my-1"
                >
                  {{ secretBindingName }}
                  <v-chip
                    v-tooltip:top="'Deprecated'"
                    size="x-small"
                    color="warning"
                    class="ml-2"
                  >
                    SecretBinding
                  </v-chip>
                </v-chip>
                <v-chip
                  v-tooltip:top="'A new CredentialsBinding will be created to reference the same Secret'"
                  tile
                  color="primary"
                  class="my-1"
                >
                  {{ secretBindingName }}
                  <v-chip
                    color="success"
                    class="ml-2"
                    size="x-small"
                  >
                    CredentialsBinding
                  </v-chip>
                </v-chip>
              </div>
            </div>
          </div>
        </v-container>
        <g-message
          v-model:message="errorMessage"
          v-model:detailed-message="detailedErrorMessage"
          color="error"
        />
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="hide"
        >
          Cancel
        </v-btn>
        <v-btn
          variant="text"
          color="toolbar-background"
          @click="onDeleteSecret"
        >
          Create CredentialsBinding
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import {
  ref,
  computed,
  inject,
  toRef,
} from 'vue'

import { useCredentialStore } from '@/store/credential'

import GMessage from '@/components/GMessage.vue'
import GToolbar from '@/components/GToolbar.vue'
import GExternalLink from '@/components/GExternalLink.vue'

import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'
import { useCredentialsBindingContext } from '@/composables/credential/useCredentialsBindingContext'

import { errorDetailsFromError } from '@/utils/error' // adjust path

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  binding: {
    type: Object,
  },
})

const emit = defineEmits(['update:modelValue'])

const logger = inject('logger')

const secretBinding = toRef(props, 'binding')

const {
  resourceName: secretBindingName,
  credentialName: secretName,
  credentialNamespace: secretNamespace,
  credentialUsageCount: secretUsageCount,
  providerType: secretProviderType,
} = useCloudProviderBinding(secretBinding)

const {
  bindingManifest: credentialsBindingManifest,
  bindingName: credentialsBindingName,
  bindingProviderType: credentialsBindingProviderType,
  bindingRef: credentialsBindingRef,
  createBindingManifest,
} = useCredentialsBindingContext()

createBindingManifest()

credentialsBindingName.value = secretBindingName.value
credentialsBindingProviderType.value = secretProviderType.value
credentialsBindingRef.value.name = secretName.value
credentialsBindingRef.value.namespace = secretNamespace.value

const errorMessage = ref()
const detailedErrorMessage = ref()

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

// store actions (replaces mapActions)
const credentialStore = useCredentialStore()
const { createInfraCredential } = credentialStore

// methods
function hide () {
  visible.value = false
}

async function onDeleteSecret () {
  try {
    if (secretName?.value) {
      await createInfraCredential({
        binding: credentialsBindingManifest.value,
      })
    }

    hide()
  } catch (err) {
    const errorDetails = errorDetailsFromError(err)
    errorMessage.value = 'Failed to create CredentialsBinding'
    detailedErrorMessage.value = errorDetails.detailedMessage

    logger?.error(
      errorMessage.value,
      errorDetails.errorCode,
      errorDetails.detailedMessage,
      err,
    )
  }
}

</script>
