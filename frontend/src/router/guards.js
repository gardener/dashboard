//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import includes from 'lodash/includes'
import isEmpty from 'lodash/isEmpty'
import { getConfiguration } from '@/utils/api'

export default function createGuards (store, userManager, localStorage) {
  return {
    beforeEach: [
      setLoading(store, true),
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

function ensureUserAuthenticatedForNonPublicRoutes (store, userManager) {
  return (to, from, next) => {
    const { meta = {}, path } = to
    if (meta.public) {
      return next()
    }
    const user = userManager.getUser()
    if (!user) {
      console.log('No user found --> Redirecting to login page') // eslint-disable-line
      const query = path !== '/' ? { redirectPath: path } : undefined
      return next({
        name: 'Login',
        query
      })
    }
    if (userManager.isSessionExpired()) {
      console.log('Session is expired --> Redirecting to logout page') // eslint-disable-line
      userManager.signout()
      return next(false)
    }
    const storedUser = store.state.user
    if (!storedUser || storedUser.jti !== user.jti) {
      store.commit('SET_USER', user)
    }
    return next()
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
      const namespace = to.params.namespace || to.query.namespace
      await Promise.all([
        ensureConfigurationLoaded(store),
        ensureProjectsLoaded(store),
        ensureCloudProfilesLoaded(store),
        ensureSeedsLoaded(store),
        ensureKubeconfigDataLoaded(store),
        ensureExtensionInformationLoaded(store),
        store.dispatch('setNamespace', namespace)
      ])

      if (namespace && namespace !== '_all' && !includes(store.getters.namespaces, namespace)) {
        store.commit('SET_NAMESPACE', null)
      }

      switch (to.name) {
        case 'Secrets':
        case 'Secret': {
          await Promise.all([
            store.dispatch('fetchcloudProviderSecrets'),
            store.dispatch('shoots/subscribe')
          ])
          break
        }
        case 'NewShoot':
        case 'NewShootEditor': {
          const promises = [
            store.dispatch('shoots/subscribe')
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
            store.dispatch('shoots/subscribe')
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
            store.dispatch('shoots/subscribe')
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
