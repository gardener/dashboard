//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi, useLogger } from '@/composables'
import { useAuthzStore } from './authz'

export const useTerminalStore = defineStore('terminal', () => {
  const logger = useLogger()
  const api = useApi()
  const authzStore = useAuthzStore()

  const draggingDragAndDropId = ref()
  const projectTerminalShortcuts = ref(null)

  function setDraggingDragAndDropId (value) {
    draggingDragAndDropId.value = value
  }

  async function ensureProjectTerminalShortcutsLoaded () {
    const namespace = authzStore.namespace
    if (!projectTerminalShortcuts.value || projectTerminalShortcuts.value.namespace !== namespace) {
      try {
        const response = await api.listProjectTerminalShortcuts({ namespace })
        projectTerminalShortcuts.value = {
          namespace,
          items: response.data,
        }
      } catch (err) {
        logger.warn('Failed to list project terminal shortcuts:', err.message)
      }
    }
  }

  function $reset () {
    draggingDragAndDropId.value = undefined
    projectTerminalShortcuts.value = null
  }

  return {
    draggingDragAndDropId,
    setDraggingDragAndDropId,
    ensureProjectTerminalShortcutsLoaded,
    $reset,
  }
})
