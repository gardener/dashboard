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
        :title="title"
      />
      <v-card-text class="card-content">
        <v-container fluid>
          <p class="font-weight-bold mb-2">
            SecretBindings are deprecated and unsupported in Kubernetes 1.34 or later
          </p>
          <p>
            <g-external-link url="https://github.com/gardener/dashboard/blob/master/docs/usage/migrate-secret-bindings.md">
              More Information
            </g-external-link>
          </p>
          <template v-if="createStep">
            <p>
              To continue using the Secret <code>{{ secretName }}</code> in your cluster, you need a CredentialsBinding.
              You can use the button below to create a CredentialsBinding that references the same Secret.
            </p>
            <div
              class="mt-3"
              style="overflow-y: scroll"
            >
              <div class="d-flex align-center">
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
                      prepend-icon="mdi-key"
                    >
                      SecretBinding (Exists)
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
                      prepend-icon="mdi-key-outline"
                    >
                      CredentialsBinding (New)
                    </v-chip>
                  </v-chip>
                </div>
                <div class="d-flex align-center">
                  <v-icon class="mx-2">
                    mdi-arrow-right
                  </v-icon>
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
                </div>
              </div>
            </div>
          </template>
          <div
            v-else
            class="list-style mt-3"
          >
            <v-alert
              type="success"
              variant="tonal"
            >
              <p>
                The Secret referenced by this deprecated SecretBinding <code>{{ secretName }}</code> has been migrated and is referenced by the following CredentialsBindings:
              </p>
              <v-chip
                v-for="bindingName in credentialsBindingNamesForSecretBinding"
                :key="bindingName"
                class="mr-2"
                size="small"
                prepend-icon="mdi-key"
              >
                {{ bindingName }}
              </v-chip>
            </v-alert>
            <v-alert
              v-if="credentialUsageCount > 0"
              type="warning"
              variant="tonal"
              class="mt-3"
            >
              <p>
                The SecretBinding is currently used by {{ credentialUsageCount }} cluster{{ credentialUsageCount === 1 ? '' : 's' }}:
              </p>
              <v-chip
                v-for="{ metadata: { uid, name }} in shootsUsingThisCredential"
                :key="uid"
                class="mr-2"
                size="small"
                prepend-icon="mdi-hexagon-multiple"
                target="_blank"
              >
                {{ name }}
              </v-chip>
              <p class="mt-2">
                Please change these clusters to use a CredentialsBinding instead.
              </p>
              <p>
                You can do this on the cluster details page using the migration button on the infrastructure card.
              </p>
            </v-alert>
          </div>
          <g-message
            v-model:message="errorMessage"
            v-model:detailed-message="detailedErrorMessage"
            color="error"
          />
        </v-container>
      </v-card-text>
      <v-divider />
      <v-card-actions v-if="createStep">
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
          @click="onCreateCredentialsBinding"
        >
          Create CredentialsBinding
        </v-btn>
      </v-card-actions>
      <v-card-actions v-else>
        <v-spacer />
        <v-btn
          variant="text"
          @click="hide"
        >
          Close
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
  credentialsBindingNamesForSecretBinding,
  credentialUsageCount,
  shootsUsingThisCredential,
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

const createStep = computed(() => {
  return !credentialsBindingNamesForSecretBinding.value.length > 0
})

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const title = computed(() => {
  if (createStep.value) {
    return `Create CredentialsBinding for Secret ${secretName.value}`
  }
  return `Secret ${secretName.value} is already referenced by a CredentialsBinding`
})

// store actions (replaces mapActions)
const credentialStore = useCredentialStore()
const { createInfraCredential } = credentialStore

// methods
function hide () {
  visible.value = false
}

async function onCreateCredentialsBinding () {
  try {
    if (secretName?.value) {
      await createInfraCredential({
        binding: credentialsBindingManifest.value,
      })
    }
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

<style scoped>

.shoot-link {
  color: inherit;
  text-decoration: none;
}

.card-content {
  overflow: scroll;
  height: auto;
}

</style>
