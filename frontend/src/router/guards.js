//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import includes from 'lodash/includes'
import isEmpty from 'lodash/isEmpty'
import { getPrivileges } from '@/utils/api'

export default function createGuards (store, userManager) {
  return {
    beforeEach: [
      setLoading(store, true),
      ensureConfigurationLoaded(store),
      ensureUserAuthenticatedForNonPublicRoutes(store, userManager),
      ensureDataLoaded(store)
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
      if (!store.state.cfg) {
        await store.dispatch('fetchConfiguration')
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

function ensureDataLoaded (store) {
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
            store.dispatch('subscribeShoots')
          ]
          if (store.getters.canGetSecrets) {
            promises.push(store.dispatch('fetchInfrastructureSecrets'))
          }
          await Promise.all(promises)
          if (from.name !== 'NewShoot' && from.name !== 'NewShootEditor') {
            await store.dispatch('resetNewShootResource')
          }
          break
        }
        case 'ShootList': {
          const promises = [
            store.dispatch('subscribeShoots')
          ]
          if (store.getters.canManageProjectTerminalShortcuts) {
            promises.push(store.dispatch('fetchProjectTerminalShortcuts'))
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

function ensureKubeconfigDataLoaded (store) {
  if (isEmpty(store.state.kubeconfigData)) {
    return store.dispatch('fetchKubeconfigData')
  }
}
