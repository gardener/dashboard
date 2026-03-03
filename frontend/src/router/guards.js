//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { useAppStore } from '@/store/app'
import { useAuthzStore } from '@/store/authz'
import { useAuthnStore } from '@/store/authn'
import { useProjectStore } from '@/store/project'
import { useConfigStore } from '@/store/config'
import { useCloudProfileStore } from '@/store/cloudProfile'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useKubeconfigStore } from '@/store/kubeconfig'
import { useMemberStore } from '@/store/member'
import { useCredentialStore } from '@/store/credential'
import { useSeedStore } from '@/store/seed'
import { useManagedSeedStore } from '@/store/managedSeed'
import { useManagedSeedShootStore } from '@/store/managedSeedShoot'
import { useShootStore } from '@/store/shoot'
import { useTerminalStore } from '@/store/terminal'

import { useLogger } from '@/composables/useLogger'
import { useShootListFilters } from '@/composables/useShootListFilters'

import {
  getShootListContext,
  normalizeShootListRoute,
} from './shootList'

export function createGlobalBeforeGuards () {
  const logger = useLogger()
  const appStore = useAppStore()
  const authnStore = useAuthnStore()
  const authzStore = useAuthzStore()
  const configStore = useConfigStore()
  const projectStore = useProjectStore()
  const cloudProfileStore = useCloudProfileStore()
  const seedStore = useSeedStore()
  const managedSeedStore = useManagedSeedStore()
  const managedSeedShootStore = useManagedSeedShootStore()
  const gardenerExtensionStore = useGardenerExtensionStore()
  const kubeconfigStore = useKubeconfigStore()

  function ensureUserAuthenticatedForNonPublicRoutes () {
    return to => {
      const {
        meta = {},
        fullPath: redirectPath,
      } = to

      if (meta.public) {
        return true
      }

      authnStore.$reset()

      if (!authnStore.isExpired()) {
        return true
      }

      const message = !authnStore.user
        ? 'User not found'
        : 'Session has expired'
      logger.info('%s --> Redirecting to login page', message)

      const query = redirectPath && redirectPath !== '/'
        ? { redirectPath }
        : undefined
      return {
        name: 'Login',
        query,
      }
    }
  }

  function ensureCommonDataLoaded () {
    return async to => {
      if (to.meta?.public) {
        return
      }

      try {
        const namespace = to.params.namespace ?? to.query.namespace

        // Load garden rules, then conditionally load managed seeds once resolved
        const gardenRulesAndManagedSeeds = async () => {
          await ensureGardenRulesLoaded(authzStore)
          if (authzStore.canGetManagedSeedAndShootInGarden) {
            await Promise.all([
              ensureManagedSeedsLoaded(managedSeedStore),
              ensureManagedSeedShootsLoaded(managedSeedShootStore),
            ])
          }
        }
        await Promise.all([
          ensureConfigLoaded(configStore),
          ensureProjectsLoaded(projectStore),
        ])
        await Promise.all([
          ensureCloudProfilesLoaded(cloudProfileStore, namespace, projectStore.namespaces),
          ensureSeedsLoaded(seedStore),
          ensureGardenerExtensionsLoaded(gardenerExtensionStore),
          ensureKubeconfigLoaded(kubeconfigStore),
          gardenRulesAndManagedSeeds(),
        ])
      } catch (err) {
        appStore.setRouterError(err)
      }
    }
  }

  return [
    (to, from) => {
      appStore.loading = true
    },
    ensureUserAuthenticatedForNonPublicRoutes(),
    ensureCommonDataLoaded(),
  ]
}

export function createGlobalResolveGuards () {
  const logger = useLogger()
  const appStore = useAppStore()
  const authnStore = useAuthnStore()
  const authzStore = useAuthzStore()
  const projectStore = useProjectStore()
  const memberStore = useMemberStore()
  const credentialStore = useCredentialStore()
  const shootStore = useShootStore()
  const terminalStore = useTerminalStore()
  const { shootListFilters } = useShootListFilters()

  function applyShootListRouteDefaults () {
    return to => normalizeShootListRoute(to, shootListFilters.value)
  }

  function ensureDataLoaded () {
    return async to => {
      if (to.meta?.public) {
        shootStore.unsubscribeShoots()
        return
      }

      try {
        const namespace = to.params.namespace ?? to.query.namespace
        await authzStore.prepareRules(namespace)

        if (namespace && namespace !== '_all' && !projectStore.namespaces.includes(namespace)) {
          authzStore.$reset()
          const message = `User ${authnStore.username} has no authorization for namespace ${namespace}`
          logger.error(message)
          throw Object.assign(new Error(message), {
            status: 403,
            reason: 'Forbidden',
          })
        }

        switch (to.name) {
          case 'Home':
          case 'ProjectList': {
            // no action required for redirect routes
            break
          }
          case 'Credentials':
          case 'Credential': {
            shootStore.subscribeShoots({ namespace })
            await credentialStore.fetchCredentials(namespace)
            break
          }
          case 'NewShoot':
          case 'NewShootEditor': {
            shootStore.subscribeShoots({ namespace })
            if (authzStore.canGetCloudProviderCredentialsForNamespace(namespace)) {
              await credentialStore.fetchCredentials(namespace)
            }
            break
          }
          case 'ShootList': {
            const promises = []
            if (authzStore.canUseProjectTerminalShortcutsForNamespace(namespace)) {
              promises.push(terminalStore.ensureProjectTerminalShortcutsLoaded(namespace))
            }
            if (authzStore.canGetCloudProviderCredentialsForNamespace(namespace)) {
              promises.push(credentialStore.fetchCredentials(namespace))
            }
            await Promise.all(promises)
            break
          }
          case 'ShootItem':
          case 'ShootItemEditor':
          case 'ShootItemHibernationSettings':
          case 'ShootItemTerminal': {
            // shoot subscription and data retrieval is done in GShootItemPlaceholder
            break
          }
          case 'Members':
          case 'Administration': {
            shootStore.subscribeShoots({ namespace })
            await memberStore.fetchMembers(namespace)
            break
          }
          default: {
            shootStore.unsubscribeShoots()
            break
          }
        }
      } catch (err) {
        appStore.setRouterError(err)
      }
    }
  }

  return [
    applyShootListRouteDefaults(),
    ensureDataLoaded(),
  ]
}

export function createGlobalAfterHooks () {
  const appStore = useAppStore()
  const authzStore = useAuthzStore()
  const shootStore = useShootStore()

  return [
    (to, from, failure) => {
      if (!failure) {
        if (to.meta?.public) {
          shootStore.deactivateShootList()
        } else {
          const namespace = to.params.namespace ?? to.query.namespace
          authzStore.activateRules(namespace)

          if (to.name === 'ShootList') {
            shootStore.activateShootList(getShootListContext(to))
          } else {
            shootStore.deactivateShootList()
          }
        }
      }
      appStore.loading = false
      appStore.fromRoute = from
    },
  ]
}

async function ensureConfigLoaded (store) {
  if (store.isInitial) {
    return store.fetchConfig()
  }
}

function ensureProjectsLoaded (store) {
  if (store.isInitial) {
    return store.fetchProjects()
  }
}

async function ensureCloudProfilesLoaded (store, namespace, namespaces = []) {
  if (store.isInitial) {
    await store.fetchCloudProfiles()
  }
  if (namespace === '_all') {
    await store.fetchNamespacedCloudProfilesForNamespaces(namespaces)
    return
  }
  if (namespace && !store.hasNamespacedCloudProfilesForNamespace(namespace)) {
    await store.fetchNamespacedCloudProfiles(namespace)
  }
}

function ensureSeedsLoaded (store) {
  if (store.isInitial) {
    return store.fetchSeeds()
  }
}

function ensureManagedSeedsLoaded (store) {
  if (store.isInitial) {
    return store.fetchManagedSeeds()
  }
}

function ensureManagedSeedShootsLoaded (store) {
  if (store.isInitial) {
    return store.fetchManagedSeedShoots()
  }
}

function ensureGardenerExtensionsLoaded (store) {
  if (store.isInitial) {
    return store.fetchGardenerExtensions()
  }
}

function ensureKubeconfigLoaded (store) {
  if (store.isInitial) {
    return store.fetchKubeconfig()
  }
}

function ensureGardenRulesLoaded (store) {
  if (store.isGardenInitial) {
    return store.fetchGardenRules()
  }
}
