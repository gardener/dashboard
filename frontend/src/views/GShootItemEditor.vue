<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div class="fill-height">
    <g-shoot-editor :identifier="injectionKey">
      <template #modificationWarning>
        Directly modifying this resource can result in irreversible configurations that may severely compromise your cluster's stability and functionality.
        Use resource editor with caution.
      </template>
      <template #errorMessage>
        <g-message
          v-model:message="errorMessage"
          v-model:detailed-message="detailedErrorMessage"
          color="error"
          class="ma-0"
          tile
        />
      </template>
      <template #toolbarItemsRight>
        <v-btn
          variant="text"
          :disabled="clean"
          color="primary"
          @click.stop="save"
        >
          Save
        </v-btn>
      </template>
    </g-shoot-editor>
    <g-confirm-dialog ref="confirmDialog" />
  </div>
</template>

<script setup>
import {
  ref,
  inject,
  provide,
} from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

import GShootEditor from '@/components/GShootEditor'
import GConfirmDialog from '@/components/dialogs/GConfirmDialog'
import GMessage from '@/components/GMessage'

import { useShootItem } from '@/composables/useShootItem'
import { useShootEditor } from '@/composables/useShootEditor'

import { errorDetailsFromError } from '@/utils/error'

import pick from 'lodash/pick'
import isEmpty from 'lodash/isEmpty'

const api = inject('api')
const logger = inject('logger')

const injectionKey = 'shoot-editor'
const confirmDialog = ref(null)
const errorMessage = ref()
const detailedErrorMessage = ref()
const {
  shootItem,
  shootNamespace,
  shootName,
} = useShootItem()

const useProvide = (key, value) => {
  provide(key, value)
  return value
}
const {
  clean,
  touched,
  conflictPath,
  getEditorValue,
  focusEditor,
  setEditorTouched,
} = useProvide(injectionKey, useShootEditor(shootItem, {
  extraKeys: [
    { key: 'Ctrl-s',
      run: save },
    { key: 'Cmd-s',
      run: save },
  ],
}))

async function save () {
  try {
    if (!touched.value) {
      return
    }
    if (clean.value) {
      setEditorTouched(false)
      return
    }

    const hasConflict = !isEmpty(conflictPath.value)
    if (hasConflict) {
      const overwrite = await confirmOverwrite()
      if (!overwrite) {
        return
      }
      conflictPath.value = null
    }

    const shootResource = getEditorValue()

    setEditorTouched(false)
    await api.replaceShoot({
      namespace: shootNamespace.value,
      name: shootName.value,
      data: pick(shootResource, ['spec', 'metadata.labels', 'metadata.annotations']),
    })
  } catch (err) {
    // Reset editor state to allow user to retry saving
    setEditorTouched(true)

    errorMessage.value = 'Failed to save changes.'
    if (err.response) {
      const errorDetails = errorDetailsFromError(err)
      detailedErrorMessage.value = errorDetails.detailedMessage
    } else {
      detailedErrorMessage.value = err.message
    }
    logger.error(errorMessage.value, detailedErrorMessage.value, err)
  }
}

function confirmEditorNavigation () {
  return confirmDialog.value?.waitForConfirmation({
    confirmButtonText: 'Yes',
    cancelButtonText: 'No',
    captionText: 'Leave Editor?',
    messageHtml: 'Your changes have not been saved.<br/>Are you sure you want to leave the editor?',
  })
}

function confirmOverwrite () {
  return confirmDialog.value?.waitForConfirmation({
    confirmButtonText: 'Save',
    captionText: 'Confirm Overwrite',
    messageHtml: 'Meanwhile another user or process has changed the cluster resource.<br/>Are you sure you want to overwrite it?',
  })
}

onBeforeRouteLeave(async (to, from, next) => {
  if (clean.value) {
    return next()
  }
  try {
    if (await confirmEditorNavigation()) {
      next()
    } else {
      focusEditor()
      next(false)
    }
  } catch (err) {
    next(err)
  }
})
</script>
