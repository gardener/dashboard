//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { useAppStore } from '@/store/app'
import { useConfigStore } from '@/store/config'
import { useAuthnzStore } from '@/store/authz'
import { useProjectStore } from '@/store/project'
import { useToken, useLogger, useUser } from '@/composables'

export function createGuards () {
  const appStore = useAppStore()
  const configStore = useConfigStore()
  const projectStore = useProjectStore()
  const authzStore = useAuthnzStore()
  const logger = useLogger()
  const token = useToken()
  const user = useUser()

  function ensureUserAuthenticatedForNonPublicRoutes () {
    return (to) => {
      const { meta = {}, path } = to
      if (!meta.public && token.isExpired()) {
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
          refreshRules(authzStore, namespace),
        ])

        if (namespace && namespace !== '_all' && !projectStore.namespaces.includes(namespace)) {
          authzStore.$reset()
          const username = user.username.value
          throw new Error(`User ${username} has no authorization for namespace ${namespace}`)
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

