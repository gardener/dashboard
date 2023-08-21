//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { useLocalStorage } from '@vueuse/core'

export function createGuards (context) {
  const {
    logger,
    appStore,
    configStore,
    authnStore,
    authzStore,
    projectStore,
    cloudProfileStore,
    seedStore,
    gardenerExtensionStore,
    kubeconfigStore,
    memberStore,
    secretStore,
    shootStore,
    terminalStore,
  } = context
  const shootListFilter = useLocalStorage('project/_all/shoot-list/filter', {})

  function ensureUserAuthenticatedForNonPublicRoutes () {
    return (to) => {
      const { meta = {}, path } = to
      authnStore.$reset()
      if (!meta.public && authnStore.isExpired()) {
        logger.info('User not found or session has expired --> Redirecting to login page')
        const query = path !== '/'
          ? { redirectPath: path }
          : undefined
        return {
          name: 'Login',
          query,
        }
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
            const isAdmin = authnStore.isAdmin

            // filter has to be set before subscribing shoots
            shootStore.setShootListFilters({
              onlyShootsWithIssues: isAdmin,
              progressing: true,
              noOperatorAction: isAdmin,
              deactivatedReconciliation: isAdmin,
              hideTicketsWithLabel: isAdmin,
              ...shootListFilter.value,
            })

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

  return {
    beforeEach: [
      () => {
        appStore.loading = true
      },
      ensureUserAuthenticatedForNonPublicRoutes(),
      ensureDataLoaded(),
    ],
    afterEach: [
      (to, from) => {
        appStore.loading = false
        appStore.fromRoute = from
      },
    ],
  }
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
