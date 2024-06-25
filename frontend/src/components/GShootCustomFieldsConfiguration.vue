<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-generic-action-button-dialog
    caption="Configure Custom Fields for Shoot Clusters"
    disable-confirm-input-focus
    :can-perform-action="canPatchProject"
    :disabled="!canPatchProject"
    cancel-button-text=""
    confirm-button-text="Close"
    width="90vw"
    @before-dialog-opened="setProjectManifest(projectItem)"
  >
    <template #content>
      <div class="ma-3">
        <g-manage-shoot-custom-fields />
      </div>
    </template>
  </g-generic-action-button-dialog>
</template>

<script setup>
import { toRef } from 'vue'

import { useAuthzStore } from '@/store/authz'

import GGenericActionButtonDialog from '@/components/dialogs/GGenericActionButtonDialog'
import GManageShootCustomFields from '@/components/GManageShootCustomFields'

import { useProjectContext } from '@/composables/useProjectContext'
import { useProjectItem } from '@/composables/useProjectItem'

const authzStore = useAuthzStore()

const {
  projectItem,
} = useProjectItem()

const {
  setProjectManifest,
} = useProjectContext()

const canPatchProject = toRef(authzStore, 'canPatchProject')

</script>
