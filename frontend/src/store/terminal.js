//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import { useApi, useLogger } from '@/composables'
import { useAuthzStore } from './authz'
import { useConfigStore } from './config'

import { TargetEnum, Shortcut } from '@/utils'

import map from 'lodash/map'
import uniqBy from 'lodash/uniqBy'
import filter from 'lodash/filter'
import includes from 'lodash/includes'
import isEmpty from 'lodash/isEmpty'

export const useTerminalStore = defineStore('terminal', () => {
  const logger = useLogger()
  const api = useApi()
  const authzStore = useAuthzStore()
  const configStore = useConfigStore()

  const draggingDragAndDropId = ref()
  const projectTerminalShortcuts = ref(null)

  const isTerminalShortcutsFeatureEnabled = computed(() => {
    return !isEmpty(terminalShortcutsByTargetsFilter()) || configStore.isProjectTerminalShortcutsEnabled
  })

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

  function filterShortcuts ({ shortcuts, targetsFilter }) {
    shortcuts = filter(shortcuts, ({ target }) => (target === TargetEnum.CONTROL_PLANE && authzStore.hasControlPlaneTerminalAccess) || target !== TargetEnum.CONTROL_PLANE)
    shortcuts = filter(shortcuts, ({ target }) => (target === TargetEnum.GARDEN && authzStore.hasGardenTerminalAccess) || target !== TargetEnum.GARDEN)
    shortcuts = filter(shortcuts, ({ target }) => ((target === TargetEnum.SHOOT && authzStore.hasShootTerminalAccess) || target !== TargetEnum.SHOOT))
    shortcuts = filter(shortcuts, ({ target }) => includes(targetsFilter, target))
    return shortcuts
  }

  function createShortcuts (shortcuts, unverified = true) {
    return uniqBy(map(shortcuts, shortcut => new Shortcut(shortcut, unverified)), 'id')
  }

  function terminalShortcutsByTargetsFilter (targetsFilter = [TargetEnum.SHOOT, TargetEnum.CONTROL_PLANE, TargetEnum.GARDEN]) {
    const shortcuts = createShortcuts(configStore.terminalShortcuts, false)
    return filterShortcuts({ shortcuts, targetsFilter })
  }

  function projectTerminalShortcutsByTargetsFilter (targetsFilter = [TargetEnum.SHOOT, TargetEnum.CONTROL_PLANE, TargetEnum.GARDEN]) {
    if (projectTerminalShortcuts.value?.namespace !== authzStore.namespace) {
      return
    }
    const shortcuts = createShortcuts(projectTerminalShortcuts.value?.items, true)
    return filterShortcuts({ shortcuts, targetsFilter })
  }

  return {
    draggingDragAndDropId,
    setDraggingDragAndDropId,
    ensureProjectTerminalShortcutsLoaded,
    $reset,
    terminalShortcutsByTargetsFilter,
    projectTerminalShortcutsByTargetsFilter,
    isTerminalShortcutsFeatureEnabled,
  }
})
