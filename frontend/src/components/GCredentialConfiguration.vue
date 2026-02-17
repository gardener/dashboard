<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    width="450"
    caption="Configure Credential"
    confirm-required
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <v-card-text>
        <g-select-credential
          v-model="infrastructureBinding"
          :provider-type="shootProviderType"
        />
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
import {
  isCredentialsBinding,
  isSecretBinding,
} from '@/composables/credential/helper'

import { errorDetailsFromError } from '@/utils/error'
const api = inject('api')
const logger = inject('logger')

const actionDialog = ref(null)
const infrastructureBinding = ref(null)

const {
  shootNamespace,
  shootName,
  shootProviderType,
  shootCloudProviderBinding,
} = useShootItem()

async function onConfigurationDialogOpened () {
  infrastructureBinding.value = shootCloudProviderBinding.value

  const confirmed = await actionDialog.value.waitForDialogClosed()
  if (confirmed) {
    await updateConfiguration()
  }
}

async function updateConfiguration () {
  try {
    const data = {}
    if (isCredentialsBinding(infrastructureBinding.value)) {
      data.credentialsBindingName = infrastructureBinding.value.metadata.name
    } else if (isSecretBinding(infrastructureBinding.value)) {
      data.secretBindingName = infrastructureBinding.value.metadata.name
    }
    await api.updateShootCredentialName({
      namespace: shootNamespace.value,
      name: shootName.value,
      data,
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
</script>
