<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    width="450"
    :caption="migrationMode ? 'Migrate Credential' : 'Configure Credential'"
    :icon="migrationMode ? 'mdi-key-change' : undefined"
    confirm-required
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <v-card-text>
        <g-select-credential
          v-model="infrastructureBinding"
          :provider-type="shootProviderType"
          :filter-fn="credentialFilterFn"
        />
        <template v-if="migrationMode">
          <v-alert
            v-if="credentialsBindingNamesForSecretBinding.length"
            variant="tonal"
            type="info"
            class="mt-2"
          >
            <p>
              Select a CredentialsBinding to migrate the cluster's credential.
              The CredentialsBinding must reference the same Secret as the currently used SecretBinding.
            </p>
            <p>
              <g-external-link url="https://github.com/gardener/dashboard/blob/master/docs/usage/migrate-secret-bindings.md#migration-steps">
                More Information
              </g-external-link>
            </p>
          </v-alert>
          <v-alert
            v-else
            variant="tonal"
            type="warning"
            class="mt-2"
          >
            <p>
              There are no available CredentialsBindings to migrate to. Please create a CredentialsBinding that references the same Secret as the currently used SecretBinding before you can migrate.
            </p>
            <p>
              <g-external-link url="https://github.com/gardener/dashboard/blob/master/docs/usage/migrate-secret-bindings.md#step-1-create-a-credentialsbinding-for-a-secretbinding">
                More Information
              </g-external-link>
            </p>
          </v-alert>
        </template>
      </v-card-text>
    </template>
  </g-action-button-dialog>
</template>

<script setup>
import {
  ref,
  inject,
} from 'vue'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'
import GSelectCredential from '@/components/Credentials/GSelectCredential'

import { useShootItem } from '@/composables/useShootItem'
import { isCredentialsBinding } from '@/composables/credential/helper'
import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'

import { errorDetailsFromError } from '@/utils/error'

const api = inject('api')
const logger = inject('logger')

const actionDialog = ref(null)
const infrastructureBinding = ref(null)

const props = defineProps({
  migrationMode: {
    type: Boolean,
    default: false,
  },
})

const {
  shootNamespace,
  shootName,
  shootProviderType,
  shootCloudProviderBinding,
} = useShootItem()

const {
  credentialsBindingNamesForSecretBinding,
} = useCloudProviderBinding(shootCloudProviderBinding)

async function onConfigurationDialogOpened () {
  infrastructureBinding.value = null
  if (!props.migrationMode) {
    infrastructureBinding.value = shootCloudProviderBinding.value
  }

  const confirmed = await actionDialog.value.waitForDialogClosed()
  if (confirmed) {
    await updateConfiguration()
  }
}

async function updateConfiguration () {
  try {
    const credentialsBindingName = infrastructureBinding.value.metadata.name
    await api.updateShootCredentialName({
      namespace: shootNamespace.value,
      name: shootName.value,
      data: {
        credentialsBindingName,
      },
    })
  } catch (err) {
    const errorMessage = 'Could not update credential'
    const errorDetails = errorDetailsFromError(err)
    const detailedErrorMessage = errorDetails.detailedMessage

    actionDialog.value.setError({ errorMessage, detailedErrorMessage })

    logger.error(
      errorMessage,
      errorDetails.errorCode,
      errorDetails.detailedMessage,
      err,
    )
  }
}

function credentialFilterFn (credential) {
  if (!isCredentialsBinding(credential)) {
    return false
  }
  if (!props.migrationMode) {
    return true
  }
  // shootCloudProviderBinding is a secret binding in migration mode
  return shootCloudProviderBinding.value.secretRef.name === credential.credentialsRef.name && credential.credentialsRef.kind === 'Secret'
}
</script>
