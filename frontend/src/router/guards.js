//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  useAppStore,
  useConfigStore,
  useAuthnStore,
  useAuthzStore,
  useProjectStore,
  useCloudProfileStore,
  useSeedStore,
  useGardenerExtensionStore,
  useKubeconfigStore,
} from '@/store'
import { useLogger } from '@/composables'

export function createGuards () {
  const appStore = useAppStore()
  const configStore = useConfigStore()
  const authnStore = useAuthnStore()
  const authzStore = useAuthzStore()
  const projectStore = useProjectStore()
  const cloudProfileStore = useCloudProfileStore()
  const seedStore = useSeedStore()
  const gardenerExtensionsStore = useGardenerExtensionStore()
  const kubeconfigStore = useKubeconfigStore()
  const logger = useLogger()

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
        // TODO unsubscribeShoots
        return next()
      }

      try {
        const namespace = to.params.namespace ?? to.query.namespace
        await Promise.all([
          ensureConfigLoaded(configStore),
          ensureProjectsLoaded(projectStore),
          ensureCloudProfilesLoaded(cloudProfileStore),
          ensureSeedsLoaded(seedStore),
          ensureGardenerExtensionsLoaded(gardenerExtensionsStore),
          ensureKubeconfigLoaded(kubeconfigStore),
          refreshRules(authzStore, namespace),
        ])

        if (namespace && namespace !== '_all' && !projectStore.namespaces.includes(namespace)) {
          authzStore.$reset()
          logger.error('User %s has no authorization for namespace %s', authnStore.username, namespace)
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
