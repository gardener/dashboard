//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineStore,
  acceptHMRUpdate,
} from 'pinia'
import {
  ref,
  computed,
} from 'vue'

import { useApi } from '@/composables/useApi'

import { canI } from '@/utils'

import { useConfigStore } from './config'
import { useAuthnStore } from './authn'
import { useProjectStore } from './project'

export const useAuthzStore = defineStore('authz', () => {
  const api = useApi()
  const authnStore = useAuthnStore()
  const configStore = useConfigStore()
  const projectStore = useProjectStore()

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

  const canGetCloudProviderCredentials = computed(() => {
    return canI(status.value, 'list', '', 'secrets') && canI(status.value, 'list', 'security.gardener.cloud', 'workloadidentities')
  })

  const canCreateCredentials = computed(() => {
    return canI(status.value, 'create', '', 'secrets') && canI(status.value, 'create', 'security.gardener.cloud', 'workloadidentities')
  })

  const canPatchCredentials = computed(() => {
    return canI(status.value, 'patch', '', 'secrets') && canI(status.value, 'patch', 'security.gardener.cloud', 'workloadidentities')
  })

  const canDeleteCredentials = computed(() => {
    return canI(status.value, 'delete', '', 'secrets') && canI(status.value, 'delete', 'security.gardener.cloud', 'workloadidentities')
  })

  const canCreateShootsAdminkubeconfig = computed(() => {
    return canI(status.value, 'create', 'core.gardener.cloud', 'shoots/adminkubeconfig')
  })

  const canCreateShootsViewerkubeconfig = computed(() => {
    return canI(status.value, 'create', 'core.gardener.cloud', 'shoots/viewerkubeconfig')
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

  const canPatchProject = computed(() => {
    return canI(status.value, 'patch', 'core.gardener.cloud', 'projects', projectStore.projectName)
  })

  const canManageMembers = computed(() => {
    return canI(status.value, 'manage-members', 'core.gardener.cloud', 'projects', projectStore.projectName)
  })

  const canManageServiceAccountMembers = computed(() => {
    return canPatchProject.value || canManageMembers.value
  })

  const canDeleteProject = computed(() => {
    return canI(status.value, 'delete', 'core.gardener.cloud', 'projects', projectStore.projectName)
  })

  const canGetProjectTerminalShortcuts = computed(() => {
    return canGetCloudProviderCredentials.value
  })

  const canUseProjectTerminalShortcuts = computed(() => {
    return configStore.isProjectTerminalShortcutsEnabled &&
      canGetProjectTerminalShortcuts.value &&
      canCreateTerminals.value
  })

  const hasGardenTerminalAccess = computed(() => {
    return configStore.isTerminalEnabled &&
    canCreateTerminals.value &&
    canPatchServiceAccounts.value &&
    canCreateServiceAccounts.value
  })

  const hasControlPlaneTerminalAccess = computed(() => {
    return configStore.isTerminalEnabled &&
      canCreateTerminals.value &&
      authnStore.isAdmin
  })

  const hasShootTerminalAccess = computed(() => {
    return configStore.isTerminalEnabled &&
      canCreateTerminals.value
  })

  // reuse function not exported
  async function getRules (namespace, accountId) {
    const body = {
      namespace,
      accountId,
    }
    const response = await api.getSubjectRules(body)
    status.value = response.data
  }

  async function fetchRules (namespace, accountId) {
    /**
     * The value of `spec.value?.namespace` is:
     * - undefined if no rules have been fetched yet
     * - null if only cluster scoped rules have been fetched
     * - a non-empty string if both cluster scoped rules and the rules for the namespace have been fetched
     */
    if (!namespace) {
      namespace = null
    }
    if (
      spec.value?.namespace !== namespace ||
      spec.value?.accountId !== accountId
    ) {
      await getRules(namespace, accountId)
      spec.value = { namespace, accountId }
    }
  }

  function refreshRules () {
    return getRules(spec.value?.namespace, spec.value?.accountId)
  }

  function setNamespace (namespace) {
    spec.value = spec.value || {}
    spec.value.namespace = namespace
  }

  function $reset () {
    spec.value = null
    status.value = null
  }

  return {
    namespace,
    setNamespace,
    canCreateTerminals,
    canCreateShoots,
    canPatchShoots,
    canDeleteShoots,
    canPatchShootsBinding,
    canGetCloudProviderCredentials,
    canCreateCredentials,
    canCreateShootsAdminkubeconfig,
    canCreateShootsViewerkubeconfig,
    canPatchCredentials,
    canDeleteCredentials,
    canCreateTokenRequest,
    canCreateServiceAccounts,
    canPatchServiceAccounts,
    canDeleteServiceAccounts,
    canCreateProject,
    canPatchProject,
    canDeleteProject,
    canManageMembers,
    canManageServiceAccountMembers,
    canGetProjectTerminalShortcuts,
    canUseProjectTerminalShortcuts,
    hasGardenTerminalAccess,
    hasControlPlaneTerminalAccess,
    hasShootTerminalAccess,
    fetchRules,
    refreshRules,
    $reset,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthzStore, import.meta.hot))
}
