<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-generic-action-button-dialog
    ref="actionDialog"
    caption="Configure Custom Fields for Shoot Clusters"
    disable-confirm-input-focus
    :can-perform-action="canPatchProject"
    :disabled="!canPatchProject"
    width="90vw"
    @before-dialog-opened="setProjectManifest(projectItem)"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <div class="ma-3">
        <g-manage-shoot-custom-fields />
      </div>
    </template>
  </g-generic-action-button-dialog>
</template>

<script setup>
import {
  ref,
  toRef,
} from 'vue'

import { useAuthzStore } from '@/store/authz'
import { useProjectStore } from '@/store/project'

import GGenericActionButtonDialog from '@/components/dialogs/GGenericActionButtonDialog'
import GManageShootCustomFields from '@/components/GManageShootCustomFields'

import { useLogger } from '@/composables/useLogger'
import { useProjectContext } from '@/composables/useProjectContext'
import { useProjectItem } from '@/composables/useProjectItem'

import { errorDetailsFromError } from '@/utils/error'

const logger = useLogger()
const authzStore = useAuthzStore()

const projectStore = useProjectStore()
const {
  projectItem,
} = useProjectItem()

const {
  setProjectManifest,
  getShootCustomFieldsPatchData,
} = useProjectContext()

const actionDialog = ref(null)

const canPatchProject = toRef(authzStore, 'canPatchProject')

async function onConfigurationDialogOpened () {
  const confirmed = await actionDialog.value.waitForDialogClosed()
  if (confirmed) {
    await updateConfiguration()
  }
}

async function updateConfiguration () {
  try {
    const { metadata: { name, namespace } } = projectStore.project
    const mergePatchDocument = {
      metadata: { name, namespace },
    }
    Object.assign(mergePatchDocument, getShootCustomFieldsPatchData())

    await projectStore.patchProject(mergePatchDocument)
  } catch (err) {
    const errorMessage = 'Could not save custom fields configuration'
    let detailedErrorMessage
    if (err.response) {
      const errorDetails = errorDetailsFromError(err)
      detailedErrorMessage = errorDetails.detailedMessage
    } else {
      detailedErrorMessage = err.message
    }
    actionDialog.value.setError({ errorMessage, detailedErrorMessage })
    logger.error(errorMessage, detailedErrorMessage, err)
  }
}

</script>
