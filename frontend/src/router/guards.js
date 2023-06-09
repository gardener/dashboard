//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import includes from 'lodash/includes'
import isEmpty from 'lodash/isEmpty'
import { getBrandingConfiguration, getConfiguration } from '@/utils/api'

export default function createGuards (store, userManager, localStorage, logger) {
  return {
    beforeEach: [
      setLoading(store, true),
      ensureBrandingLoaded(store),
      ensureUserAuthenticatedForNonPublicRoutes(store, userManager, logger),
      ensureDataLoaded(store, localStorage, logger)
    ],
    afterEach: [
      setLoading(store, false)
    ]
  }
}

function setLoading (store, value) {
  return (to, from, next) => {
    try {
      store.commit('SET_LOADING', value)
    } finally {
      if (typeof next === 'function') {
        next()
      }
    }
  }
}

function ensureUserAuthenticatedForNonPublicRoutes (store, userManager, logger) {
  return (to, from, next) => {
    const { meta = {}, path } = to
    if (meta.public) {
      return next()
    }
    const user = userManager.getUser()
    if (!user || userManager.isSessionExpired()) {
      logger.info('User not found or session has expired --> Redirecting to login page')
      const query = path !== '/' ? { redirectPath: path } : undefined
      return next({
        name: 'Login',
        query
      })
    }
    const storedUser = store.state.user
    if (!storedUser || storedUser.jti !== user.jti) {
      store.commit('SET_USER', user)
    }
    return next()
  }
}

function ensureDataLoaded (store, localStorage, logger) {
  return async (to, from, next) => {
    const meta = to.meta || {}
    if (meta.public || to.name === 'Error') {
      store.dispatch('unsubscribeShoots')
      return next()
    }
    try {
      const promises = [
        ensureConfigurationLoaded(store),
        ensureProjectsLoaded(store),
        ensureCloudProfilesLoaded(store),
        ensureSeedsLoaded(store),
        ensureKubeconfigDataLoaded(store),
        ensureExtensionInformationLoaded(store)
      ]

      const namespace = to.params.namespace || to.query.namespace
      if (!namespace) {
        // fetch cluster scoped roles only (e.g can create projects)
        promises.push(store.dispatch('refreshSubjectRules', undefined))
      } else if (namespace !== store.state.namespace) {
        store.commit('SET_NAMESPACE', namespace)
        promises.push(store.dispatch('refreshSubjectRules', namespace))
      }

      await Promise.all(promises)

      if (namespace && namespace !== '_all' && !includes(store.getters.namespaces, namespace)) {
        logger.error('User %s has no authorization for namespace %s', store.getters.username, namespace)
        store.commit('SET_NAMESPACE', null)
      }

      switch (to.name) {
        case 'Secrets':
        case 'Secret': {
          await Promise.all([
            store.dispatch('fetchcloudProviderSecrets'),
            store.dispatch('subscribeShoots')
          ])
          break
        }
        case 'NewShoot':
        case 'NewShootEditor': {
          const promises = [
            store.dispatch('subscribeShoots')
          ]
          if (store.getters.canGetSecrets) {
            promises.push(store.dispatch('fetchcloudProviderSecrets'))
          }
          await Promise.all(promises)

          const namespaceChanged = from.params.namespace !== to.params.namespace
          const toNewShoot = from.name !== 'NewShoot' && from.name !== 'NewShootEditor'
          if (namespaceChanged || toNewShoot) {
            await store.dispatch('resetNewShootResource')
          }
          break
        }
        case 'ShootList': {
          const isAdmin = store.getters.isAdmin
          const defaultFilter = {
            onlyShootsWithIssues: isAdmin,
            progressing: true,
            noOperatorAction: isAdmin,
            deactivatedReconciliation: isAdmin,
            hideTicketsWithLabel: isAdmin
          }
          const shootListFilters = {
            ...defaultFilter,
            ...localStorage.getObject('project/_all/shoot-list/filter')
          }
          await store.dispatch('setShootListFilters', shootListFilters) // filter has to be set before subscribing shoots

          const promises = [
            store.dispatch('subscribeShoots')
          ]

          if (store.getters.canUseProjectTerminalShortcuts) {
            promises.push(store.dispatch('ensureProjectTerminalShortcutsLoaded'))
          }
          await Promise.all(promises)
          break
        }
        case 'Members':
        case 'Administration': {
          await Promise.all([
            store.dispatch('fetchMembers'),
            store.dispatch('subscribeShoots')
          ])
          break
        }
        case 'Account':
        case 'Settings': {
          store.dispatch('unsubscribeShoots')
          break
        }
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}

function ensureBrandingLoaded (store) {
  return async (to, from, next) => {
    try {
      if (!store.state.branding) {
        const { data } = await getBrandingConfiguration()
        await store.dispatch('setBranding', data)
      }

      next()
    } catch (err) {
      next(err)
    }
  }
}

async function ensureConfigurationLoaded (store) {
  if (!store.state.cfg) {
    const { data } = await getConfiguration()
    await store.dispatch('setConfiguration', data)
  }
}

function ensureProjectsLoaded (store) {
  if (isEmpty(store.getters.projectList)) {
    return store.dispatch('fetchProjects')
  }
}

function ensureCloudProfilesLoaded (store) {
  if (isEmpty(store.getters.cloudProfileList)) {
    return store.dispatch('fetchCloudProfiles')
  }
}

function ensureSeedsLoaded (store) {
  if (isEmpty(store.getters.seedList)) {
    return store.dispatch('fetchSeeds')
  }
}

function ensureKubeconfigDataLoaded (store) {
  if (isEmpty(store.state.kubeconfigData)) {
    return store.dispatch('fetchKubeconfigData')
  }
}

function ensureExtensionInformationLoaded (store) {
  if (isEmpty(store.getters.gardenerExtensionsList)) {
    return store.dispatch('fetchGardenerExtensions')
  }
}
