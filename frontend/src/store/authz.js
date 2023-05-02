//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi, useUser } from '@/composables'
import { useConfigStore } from './config'
import { canI } from '@/utils'

export const useAuthzStore = defineStore('authz', () => {
  const api = useApi()
  const { isAdmin } = useUser()
  const { isTerminalEnabled, isProjectTerminalShortcutsEnabled } = useConfigStore()

  const spec = ref(null)
  const status = ref(null)

  const namespace = computed(() => {
    return spec.value?.namespace
  })

  const canCreateTerminals = computed(() => {
    return canI(status.value, 'create', 'dashboard.gardener.cloud', 'terminals')
  })

  const canCreateShoots = computed(() => {
    return canI(status.value, 'create', 'core.gardener.cloud', 'shoots')
  })

  const canPatchShoots = computed(() => {
    return canI(status.value, 'patch', 'core.gardener.cloud', 'shoots')
  })

  const canDeleteShoots = computed(() => {
    return canI(status.value, 'delete', 'core.gardener.cloud', 'shoots')
  })

  const canPatchShootsBinding = computed(() => {
    return canI(status.value, 'patch', 'core.gardener.cloud', 'shoots/binding')
  })

  const canGetSecrets = computed(() => {
    return canI(status.value, 'list', '', 'secrets')
  })

  const canCreateSecrets = computed(() => {
    return canI(status.value, 'create', '', 'secrets')
  })

  const canCreateShootsAdminkubeconfig = computed(() => {
    return canI(status.value, 'create', 'core.gardener.cloud', 'shoots/adminkubeconfig')
  })

  const canPatchSecrets = computed(() => {
    return canI(status.value, 'patch', '', 'secrets')
  })

  const canDeleteSecrets = computed(() => {
    return canI(status.value, 'delete', '', 'secrets')
  })

  const canCreateTokenRequest = computed(() => {
    return canI(status.value, 'create', '', 'serviceaccounts/token')
  })

  const canCreateServiceAccounts = computed(() => {
    return canI(status.value, 'create', '', 'serviceaccounts')
  })

  const canPatchServiceAccounts = computed(() => {
    return canI(status.value, 'patch', '', 'serviceaccounts')
  })

  const canDeleteServiceAccounts = computed(() => {
    return canI(status.value, 'delete', '', 'serviceaccounts')
  })

  const canCreateProject = computed(() => {
    return canI(status.value, 'create', 'core.gardener.cloud', 'projects')
  })

  const canGetProjectTerminalShortcuts = computed(() => {
    return canGetSecrets.value
  })

  const canUseProjectTerminalShortcuts = computed(() => {
    return isProjectTerminalShortcutsEnabled.value &&
      canGetProjectTerminalShortcuts.value &&
      canCreateTerminals.value
  })

  const hasGardenTerminalAccess = computed(() => {
    return isTerminalEnabled.value &&
    canCreateTerminals.value &&
    canPatchServiceAccounts.value &&
    canCreateServiceAccounts.value
  })

  const hasControlPlaneTerminalAccess = computed(() => {
    return isTerminalEnabled.value &&
      canCreateTerminals.value &&
      isAdmin.value
  })

  const hasShootTerminalAccess = computed(() => {
    return isTerminalEnabled.value &&
      canCreateTerminals.value
  })

  async function fetchRules (namespace) {
    if (spec.value && spec.value.namespace === namespace) {
      return
    }
    const body = { namespace }
    const response = await api.getSubjectRules(body)
    spec.value = body
    status.value = response.data
  }

  function $reset () {
    spec.value = null
    status.value = null
  }

  return {
    namespace,
    canCreateTerminals,
    canCreateShoots,
    canPatchShoots,
    canDeleteShoots,
    canPatchShootsBinding,
    canGetSecrets,
    canCreateSecrets,
    canCreateShootsAdminkubeconfig,
    canPatchSecrets,
    canDeleteSecrets,
    canCreateTokenRequest,
    canCreateServiceAccounts,
    canPatchServiceAccounts,
    canDeleteServiceAccounts,
    canCreateProject,
    canGetProjectTerminalShortcuts,
    canUseProjectTerminalShortcuts,
    hasGardenTerminalAccess,
    hasControlPlaneTerminalAccess,
    hasShootTerminalAccess,
    fetchRules,
    $reset,
  }
})
