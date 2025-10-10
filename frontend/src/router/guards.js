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
import { useShootStore } from '@/store/shoot'
import { useTerminalStore } from '@/store/terminal'

import { useOpenMFP } from '@/composables/useOpenMFP'
import { useLogger } from '@/composables/useLogger'
import { useApi } from '@/composables/useApi'

export function createGlobalBeforeGuards () {
  const logger = useLogger()
  const api = useApi()
  const appStore = useAppStore()
  const authnStore = useAuthnStore()
  const configStore = useConfigStore()
  const projectStore = useProjectStore()
  const cloudProfileStore = useCloudProfileStore()
  const seedStore = useSeedStore()
  const gardenerExtensionStore = useGardenerExtensionStore()
  const kubeconfigStore = useKubeconfigStore()

  function ensureUserAuthenticatedForNonPublicRoutes () {
    return async to => {
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

      const openMFP = useOpenMFP()
      const context = await openMFP.getLuigiContext()
      if (context) {
        logger.debug('Luigi context:', context)
        const token = context.token
        if (token) {
          try {
            await api.createTokenReview({ token })
            authnStore.$reset()
            if (!authnStore.isExpired()) {
              return true
            }
          } catch (err) {
            logger.error('Luigi token review error: %s', err.message)
          }
        }
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
        await Promise.all([
          ensureConfigLoaded(configStore),
          ensureProjectsLoaded(projectStore),
          ensureCloudProfilesLoaded(cloudProfileStore),
          ensureSeedsLoaded(seedStore),
          ensureGardenerExtensionsLoaded(gardenerExtensionStore),
          ensureKubeconfigLoaded(kubeconfigStore),
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

  function ensureDataLoaded () {
    return async to => {
      if (to.meta?.public) {
        shootStore.unsubscribeShoots()
        return
      }

      try {
        const { accountId } = useOpenMFP()

        const namespace = to.params.namespace ?? to.query.namespace
        await refreshRules(authzStore, namespace, accountId.value ?? to.query.accountId)

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
            await projectStore.fetchProjects()
            break
          }
          case 'Credentials':
          case 'Credential': {
            shootStore.subscribeShoots()
            await credentialStore.fetchCredentials()
            break
          }
          case 'NewShoot':
          case 'NewShootEditor': {
            shootStore.subscribeShoots()
            if (authzStore.canGetCloudProviderCredentials) {
              await credentialStore.fetchCredentials()
            }
            break
          }
          case 'ShootList': {
            // filter has to be set before subscribing shoots
            shootStore.initializeShootListFilters()
            shootStore.subscribeShoots()
            const promises = []
            if (authzStore.canUseProjectTerminalShortcuts) {
              promises.push(terminalStore.ensureProjectTerminalShortcutsLoaded())
            }
            if (authzStore.canGetCloudProviderCredentials) {
              promises.push(credentialStore.fetchCredentials())
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
            shootStore.subscribeShoots()
            await memberStore.fetchMembers()
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
