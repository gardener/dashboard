//
// SPDX-FileCopyrightText: Contributors to the Gardener project
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

const GARDEN_NAMESPACE = 'garden'

export const useAuthzStore = defineStore('authz', () => {
  const api = useApi()
  const authnStore = useAuthnStore()
  const configStore = useConfigStore()
  const projectStore = useProjectStore()

  const rulesMap = ref(new Map())
  const rulesAccountIds = new Map()
  const currentNamespace = ref(undefined)
  const rulesRequestIds = new Map()
  let rulesRequestId = 0

  function normalizeNamespace (namespace) {
    return namespace || null
  }

  const namespace = computed(() => {
    return currentNamespace.value
  })

  const status = computed(() => {
    return rulesMap.value.get(currentNamespace.value)
  })

  function statusForNamespace (namespace) {
    return rulesMap.value.get(normalizeNamespace(namespace))
  }

  function hasRulesForNamespace (namespace) {
    return rulesMap.value.has(normalizeNamespace(namespace))
  }

  function canCreateTerminalsForNamespace (namespace) {
    const status = statusForNamespace(namespace)
    return canI(status, 'create', 'dashboard.gardener.cloud', 'terminals')
  }

  function canGetCloudProviderCredentialsForNamespace (namespace) {
    const status = statusForNamespace(namespace)
    return canI(status, 'list', '', 'secrets') && canI(status, 'list', 'security.gardener.cloud', 'workloadidentities')
  }

  function canUseProjectTerminalShortcutsForNamespace (namespace) {
    return configStore.isProjectTerminalShortcutsEnabled &&
      canGetCloudProviderCredentialsForNamespace(namespace) &&
      canCreateTerminalsForNamespace(namespace)
  }

  const gardenStatus = computed(() => {
    return rulesMap.value.get(GARDEN_NAMESPACE)
  })

  const isGardenInitial = computed(() => {
    return !rulesMap.value.get(GARDEN_NAMESPACE)
  })

  const canCreateTerminals = computed(() => {
    return canCreateTerminalsForNamespace(currentNamespace.value)
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
    return canGetCloudProviderCredentialsForNamespace(currentNamespace.value)
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
    return canUseProjectTerminalShortcutsForNamespace(currentNamespace.value)
  })

  const hasGardenTerminalAccess = computed(() => {
    return configStore.isTerminalEnabled &&
    canCreateTerminals.value &&
    canPatchServiceAccounts.value &&
    canCreateServiceAccounts.value
  })

  // Landscape-wide operator read views currently use the seed stats access
  // contract: list access to seeds plus cluster-wide list access to shoots.
  function canViewLandscapeForStatus (status) {
    // Seeds are cluster-scoped — SSRR is reliable.
    // Shoots are namespace-scoped — SSRR can't distinguish namespace-only from
    // cluster-wide access, so use JWT-based canListShootsAllNamespaces (via SSAR) instead.
    return canI(status, 'list', 'core.gardener.cloud', 'seeds') && authnStore.canListShootsAllNamespaces
  }

  function canViewLandscapeForNamespace (namespace) {
    return canViewLandscapeForStatus(statusForNamespace(namespace))
  }

  // Garden-namespace selectors
  const canGetManagedSeedAndShootInGarden = computed(() => {
    return canI(gardenStatus.value, 'get', 'seedmanagement.gardener.cloud', 'managedseeds') &&
      canI(gardenStatus.value, 'get', 'core.gardener.cloud', 'shoots')
  })

  const canViewLandscape = computed(() => {
    return canViewLandscapeForStatus(status.value)
  })

  const canCreateShootsAdminkubeconfigInGarden = computed(() => {
    return canI(gardenStatus.value, 'create', 'core.gardener.cloud', 'shoots/adminkubeconfig')
  })

  const canCreateShootsViewerkubeconfigInGarden = computed(() => {
    return canI(gardenStatus.value, 'create', 'core.gardener.cloud', 'shoots/viewerkubeconfig')
  })

  const canGetConfigMapsInGarden = computed(() => {
    return canI(gardenStatus.value, 'get', '', 'configmaps')
  })

  const hasControlPlaneTerminalAccess = computed(() => {
    return configStore.isTerminalEnabled &&
      canCreateTerminals.value &&
      canCreateShootsAdminkubeconfigInGarden.value
  })

  const hasShootTerminalAccess = computed(() => {
    return configStore.isTerminalEnabled &&
      canCreateTerminals.value
  })

  async function getRules (namespace, accountId) {
    const body = {
      namespace,
      accountId,
    }
    const response = await api.getSubjectRules(body)
    return response.data
  }

  async function prepareRules (namespace, accountId) {
    /**
     * The value of `currentNamespace` is:
     * - undefined if no rules have been fetched yet
     * - null if only cluster-scoped rules have been fetched
     * - a non-empty string if both cluster-scoped rules and the rules for the namespace have been fetched
     */
    namespace = normalizeNamespace(namespace)
    if (currentNamespace.value !== namespace || rulesAccountIds.get(namespace) !== accountId) {
      const requestId = ++rulesRequestId
      rulesRequestIds.set(namespace, requestId)
      const data = await getRules(namespace, accountId)
      if (rulesRequestIds.get(namespace) === requestId) {
        rulesMap.value.set(namespace, data)
        rulesAccountIds.set(namespace, accountId)
      }
    }
  }

  function activateRules (namespace) {
    namespace = normalizeNamespace(namespace)
    if (!rulesMap.value.has(namespace)) {
      return false
    }
    for (const key of rulesMap.value.keys()) {
      if (key !== GARDEN_NAMESPACE && key !== namespace) {
        rulesMap.value.delete(key)
        rulesAccountIds.delete(key)
      }
    }
    currentNamespace.value = namespace
    return true
  }

  async function fetchRules (namespace, accountId) {
    await prepareRules(namespace, accountId)
    activateRules(namespace)
  }

  async function fetchGardenRules () {
    const data = await getRules(GARDEN_NAMESPACE)
    rulesMap.value.set(GARDEN_NAMESPACE, data)
  }

  // Unconditionally re-fetch rules for the current namespace.
  // Used after own-role changes (e.g. GMemberDialog) where the namespace
  // hasn't changed but the permissions have.
  async function refreshRules () {
    const namespace = currentNamespace.value
    const accountId = rulesAccountIds.get(namespace)
    const data = await getRules(namespace, accountId)
    setRules(namespace, data, accountId)
  }

  function setRules (namespace, data, accountId) {
    namespace = normalizeNamespace(namespace)
    rulesMap.value.set(namespace, data)
    rulesAccountIds.set(namespace, accountId)
    activateRules(namespace)
  }

  // Test-only helper — production code should use fetchRules instead
  function _setNamespace (namespace) {
    currentNamespace.value = namespace
  }

  function $reset () {
    rulesMap.value = new Map()
    rulesAccountIds.clear()
    currentNamespace.value = undefined
    rulesRequestIds.clear()
  }

  return {
    namespace,
    _setNamespace,
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
    // Garden-namespace selectors
    canGetManagedSeedAndShootInGarden,
    canViewLandscape,
    canViewLandscapeForNamespace,
    canCreateShootsAdminkubeconfigInGarden,
    canCreateShootsViewerkubeconfigInGarden,
    canGetConfigMapsInGarden,
    isGardenInitial,
    hasRulesForNamespace,
    canGetCloudProviderCredentialsForNamespace,
    canUseProjectTerminalShortcutsForNamespace,
    prepareRules,
    activateRules,
    fetchRules,
    fetchGardenRules,
    refreshRules,
    $reset,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthzStore, import.meta.hot))
}
