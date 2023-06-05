//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { useLocalStorage } from '@vueuse/core'

export function createGuards ({ logger, useStores }) {
  const shootListFilter = useLocalStorage('project/_all/shoot-list/filter', {})

  const {
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
  } = useStores([
    'app',
    'config',
    'authn',
    'authz',
    'project',
    'cloudProfile',
    'seed',
    'gardenerExtension',
    'kubeconfig',
    'member',
    'secret',
    'shoot',
    'terminal',
  ])

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
        await shootStore.unsubscribe()
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
          logger.error('User %s has no authorization for namespace %s', authnStore.username, namespace)
        }

        switch (to.name) {
          case 'Secrets':
          case 'Secret': {
            await Promise.all([
              secretStore.fetchSecrets(),
              shootStore.subscribe(),
            ])
            break
          }
          case 'NewShoot':
          case 'NewShootEditor': {
            const promises = [
              shootStore.subscribe(),
            ]
            if (authzStore.canGetSecrets) {
              promises.push(secretStore.fetchSecrets())
            }
            await Promise.all(promises)

            const namespaceChanged = from.params.namespace !== to.params.namespace
            const toNewShoot = from.name !== 'NewShoot' && from.name !== 'NewShootEditor'
            if (namespaceChanged || toNewShoot) {
              await shootStore.resetNewShootResource()
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

            const promises = [
              shootStore.subscribe(),
            ]

            if (authzStore.canUseProjectTerminalShortcuts) {
              promises.push(terminalStore.ensureProjectTerminalShortcutsLoaded())
            }
            await Promise.all(promises)
            break
          }
          case 'Members':
          case 'Administration': {
            await Promise.all([
              memberStore.fetchMembers(),
              shootStore.subscribe(),
            ])
            break
          }
          case 'Account':
          case 'Settings': {
            await shootStore.unsubscribe()
            break
          }
        }
        next()
      } catch (err) {
        logger.error(err.message)
        next(err)
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
