//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import includes from 'lodash/includes'
import isEmpty from 'lodash/isEmpty'
import { getPrivileges, getConfiguration } from '@/utils/api'

export default function createGuards (store, userManager, localStorage) {
  return {
    beforeEach: [
      setLoading(store, true),
      ensureConfigurationLoaded(store),
      ensureUserAuthenticatedForNonPublicRoutes(store, userManager),
      ensureDataLoaded(store, localStorage)
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

function ensureConfigurationLoaded (store) {
  return async function (to, from, next) {
    try {
      if (to.name === 'Error') {
        return next()
      }
      if (!store.state.cfg) {
        const { data } = await getConfiguration()
        await store.dispatch('setConfiguration', data)
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}

function ensureUserAuthenticatedForNonPublicRoutes (store, userManager) {
  return async (to, from, next) => {
    try {
      const { meta = {}, path } = to
      if (meta.public) {
        return next()
      }
      if (userManager.isUserLoggedIn()) {
        const user = userManager.getUser()
        const storedUser = store.state.user
        if (!storedUser || storedUser.jti !== user.jti) {
          const { data: { isAdmin } } = await getPrivileges()

          await store.dispatch('setUser', { ...user, isAdmin })
        }
        return next()
      }
      const query = path !== '/' ? { redirectPath: path } : undefined
      return next({
        name: 'Login',
        query
      })
    } catch (err) {
      const { response: { status, data = {} } = {} } = err
      if (status === 401) {
        return userManager.signout(new Error(data.message))
      }
      next(err)
    }
  }
}

function ensureDataLoaded (store, localStorage) {
  return async (to, from, next) => {
    const meta = to.meta || {}
    if (meta.public) {
      return next()
    }
    if (to.name === 'Error') {
      return next()
    }
    try {
      await Promise.all([
        ensureProjectsLoaded(store),
        ensureCloudProfilesLoaded(store),
        ensureSeedsLoaded(store),
        ensureKubeconfigDataLoaded(store)
      ])

      await setNamespace(store, to.params.namespace || to.query.namespace)

      switch (to.name) {
        case 'Secrets':
        case 'Secret': {
          await Promise.all([
            store.dispatch('fetchInfrastructureSecrets'),
            store.dispatch('subscribeShoots')
          ])
          break
        }
        case 'NewShoot':
        case 'NewShootEditor': {
          const promises = [
            store.dispatch('subscribeShoots'),
            store.dispatch('fetchNetworkingTypes')
          ]
          if (store.getters.canGetSecrets) {
            promises.push(store.dispatch('fetchInfrastructureSecrets'))
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
            userIssues: isAdmin,
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
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}

function setNamespace (store, namespace) {
  const namespaces = store.getters.namespaces
  if (namespace !== store.state.namespace && (includes(namespaces, namespace) || namespace === '_all')) {
    return store.dispatch('setNamespace', namespace)
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
