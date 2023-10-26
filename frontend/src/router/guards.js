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
import { useSecretStore } from '@/store/secret'
import { useSeedStore } from '@/store/seed'
import { useShootStore } from '@/store/shoot'
import { useTerminalStore } from '@/store/terminal'

import { useLogger } from '@/composables/useLogger'

export function createGlobalBeforeGuards () {
  const logger = useLogger()
  const appStore = useAppStore()
  const authnStore = useAuthnStore()
  const authzStore = useAuthzStore()
  const configStore = useConfigStore()
  const projectStore = useProjectStore()
  const cloudProfileStore = useCloudProfileStore()
  const seedStore = useSeedStore()
  const gardenerExtensionStore = useGardenerExtensionStore()
  const kubeconfigStore = useKubeconfigStore()
  const memberStore = useMemberStore()
  const secretStore = useSecretStore()
  const shootStore = useShootStore()
  const terminalStore = useTerminalStore()

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

      const query = redirectPath
        ? { redirectPath }
        : undefined
      return {
        name: 'Login',
        query,
      }
    }
  }

  function ensureDataLoaded () {
    return async (to, from, next) => {
      const { meta = {} } = to
      if (meta.public || to.name === 'Error') {
        shootStore.unsubscribeShoots()
        return next()
      }

      try {
        const namespace = to.params.namespace ?? to.query.namespace
        await Promise.all([
          ensureConfigLoaded(configStore),
          ensureProjectsLoaded(projectStore),
          ensureCloudProfilesLoaded(cloudProfileStore),
          ensureSeedsLoaded(seedStore),
          ensureGardenerExtensionsLoaded(gardenerExtensionStore),
          ensureKubeconfigLoaded(kubeconfigStore),
          refreshRules(authzStore, namespace),
        ])

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
          case 'Secrets':
          case 'Secret': {
            shootStore.subscribeShoots()
            await secretStore.fetchSecrets()
            break
          }
          case 'NewShoot':
          case 'NewShootEditor': {
            shootStore.subscribeShoots()
            if (authzStore.canGetSecrets) {
              await secretStore.fetchSecrets()
            }

            const namespaceChanged = from.params.namespace !== to.params.namespace
            const toNewShoot = from.name !== 'NewShoot' && from.name !== 'NewShootEditor'
            if (namespaceChanged || toNewShoot) {
              shootStore.resetNewShootResource()
            }
            break
          }
          case 'ShootList': {
            // filter has to be set before subscribing shoots
            shootStore.initializeShootListFilters()
            shootStore.subscribeShoots()
            if (authzStore.canUseProjectTerminalShortcuts) {
              await terminalStore.ensureProjectTerminalShortcutsLoaded()
            }
            break
          }
          case 'Members':
          case 'Administration': {
            shootStore.subscribeShoots()
            await memberStore.fetchMembers()
            break
          }
          case 'Account':
          case 'Settings': {
            shootStore.unsubscribeShoots()
            break
          }
        }
      } catch (err) {
        appStore.setRouterError(err)
      } finally {
        next()
      }
    }
  }

  return [
    (to, from) => {
      appStore.loading = true
    },
    ensureUserAuthenticatedForNonPublicRoutes(),
    ensureDataLoaded(),
  ]
}

export function createGlobalAfterHooks () {
  const appStore = useAppStore()

  return [
    (to, from) => {
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

async function refreshRules (store, ...args) {
  return store.fetchRules(...args)
}

function ensureCloudProfilesLoaded (store) {
  if (store.isInitial) {
    return store.fetchCloudProfiles()
  }
}

function ensureSeedsLoaded (store) {
  if (store.isInitial) {
    return store.fetchSeeds()
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
