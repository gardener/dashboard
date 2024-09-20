<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-generic-action-button-dialog
    ref="actionDialog"
    width="450"
    caption="Update Cost Object"
    :can-perform-action="canPatchProject"
    @before-dialog-opened="setProjectManifest(projectItem)"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <v-card-text>
        <g-project-cost-object />
      </v-card-text>
    </template>
  </g-generic-action-button-dialog>
</template>

<script setup>
import {
  inject,
  ref,
  toRef,
} from 'vue'

import { useAuthzStore } from '@/store/authz'
import { useProjectStore } from '@/store/project'

import GGenericActionButtonDialog from '@/components/dialogs/GGenericActionButtonDialog'
import GProjectCostObject from '@/components/GProjectCostObject'

import { useProjectContext } from '@/composables/useProjectContext'
import { useProjectItem } from '@/composables/useProjectItem'

import { errorDetailsFromError } from '@/utils/error'

const authzStore = useAuthzStore()
const projectStore = useProjectStore()

const { projectItem } = useProjectItem()
const { setProjectManifest, getCostObjectPatchDocument } = useProjectContext()

const canPatchProject = toRef(authzStore, 'canPatchProject')
const actionDialog = ref(null)

const logger = inject('logger')

async function onConfigurationDialogOpened () {
  const confirmed = await actionDialog.value.waitForDialogClosed()
  if (confirmed) {
    await updateConfiguration()
  }
}

async function updateConfiguration () {
  try {
    const patchDocument = getCostObjectPatchDocument()
    await projectStore.patchProject(patchDocument)
  } catch (err) {
    const errorMessage = 'Could not update cost object'
    const errorDetails = errorDetailsFromError(err)
    const detailedErrorMessage = errorDetails.detailedMessage
    actionDialog.value.setError({ errorMessage, detailedErrorMessage })
    logger.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
  }
}

</script>
