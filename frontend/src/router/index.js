//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

import Vue from 'vue'
import Router from 'vue-router'

import moment from 'moment-timezone'
import includes from 'lodash/includes'
import head from 'lodash/head'
import get from 'lodash/get'
import cloneDeep from 'lodash/cloneDeep'
import { getPrivileges } from '@/utils/api'

/* Layouts */
const Login = () => import('@/layouts/Login')
const Default = () => import('@/layouts/Default')

/* Pages */
const Home = () => import('@/pages/Home')
const NewShoot = () => import('@/pages/NewShoot')
const ShootList = () => import('@/pages/ShootList')
const ShootItemTerminal = () => import('@/pages/ShootItemTerminal')
const ShootDetails = () => import('@/pages/ShootDetails')
const ShootDetailsEditor = () => import('@/pages/ShootDetailsEditor')
const NewShootEditor = () => import('@/pages/NewShootEditor')
const Secrets = () => import('@/pages/Secrets')
const Members = () => import('@/pages/Members')
const Account = () => import('@/pages/Account')
const Administration = () => import('@/pages/Administration')

Vue.use(Router)

export default function createRouter ({ store, userManager }) {
  /* technical components */

  const PlaceholderComponent = {
    render (createElement) {
      return createElement('router-view')
    }
  }

  function hasGardenTerminalAccess () {
    return store.getters.hasGardenTerminalAccess
  }

  function hasControlPlaneTerminalAccess () {
    return store.getters.hasControlPlaneTerminalAccess
  }

  function hasShootTerminalAccess () {
    return store.getters.hasShootTerminalAccess
  }

  function canUseTerminalFeature () {
    return store.getters.canUseTerminalFeature
  }

  function canGetSecrets () {
    return store.getters.canGetSecrets
  }

  const mode = 'history'

  /**
   * Tabstrip type definition
   * @typedef {Object} Tab
   * @prop {string}   title - The tile of the tabstrip
   * @prop {function} to    - This function determines the navigation target of the router-link.
   *                          The current route object https://router.vuejs.org/api/#the-route-object is passed as parameter
   */
  const shootItemTabs = [
    {
      key: 'shootOverview',
      title: 'Overview',
      to: ({ params }) => {
        return {
          name: 'ShootItem',
          params
        }
      }
    },
    {
      key: 'shootYaml',
      title: 'YAML',
      to: ({ params }) => {
        return {
          name: 'ShootDetailsEditor',
          params
        }
      }
    }
  ]
  const newShootTabs = [
    {
      key: 'newShootOverview',
      title: 'Overview',
      to: ({ params }) => {
        return {
          name: 'NewShoot',
          params
        }
      }
    },
    {
      key: 'newShootYaml',
      title: 'YAML',
      to: ({ params }) => {
        return {
          name: 'NewShootEditor',
          params
        }
      }
    }
  ]

  const routeTitle = function () {
    return this.title
  }

  const routeParamName = function (route) {
    return get(route, 'params.name')
  }

  const shootItemTerminalTabs = function () {
    const tabs = []

    if (hasControlPlaneTerminalAccess()) {
      tabs.push({
        key: 'terminalControlPlane',
        title: 'Control Plane',
        to: (route) => {
          const params = cloneDeep(route.params)
          params.target = 'cp'
          return {
            name: 'ShootItemTerminal',
            params
          }
        }
      })
    }

    if (hasShootTerminalAccess()) {
      tabs.push({
        key: 'terminalCluster',
        title: 'Cluster',
        to: (route) => {
          const params = cloneDeep(route.params)
          params.target = 'shoot'
          return {
            name: 'ShootItemTerminal',
            params
          }
        }
      })
    }
    return tabs
  }

  const terminalBreadcrumbTitle = function (route) {
    const target = get(route, 'params.target')
    switch (target) {
      case 'cp':
        return 'Control Plane Terminal'
      case 'shoot':
        return 'Cluster Terminal'
      case 'garden':
        return 'Garden Cluster Terminal'
      default:
        return undefined
    }
  }

  /** Route function
      @name RouteFn
      @function
      @param {Object} [route] - this.$route
  */

  /**
   * Route Meta fields type definition
   * @typedef {Object} RouteMeta
   * @prop {boolean} [public]                   - Determines whether route needs authorization
   * @prop {boolean} [namespaced]               - Determines whether route is namespace specific and has namespace in path
   * @prop {boolean} [projectScope]             - Determines whether route can be accessed in context of mutiple projects (_all)
   * @prop {string}  [toRouteName]              - It is possible to set a default child route for a top level item (like the PlaceholderComponent)
   * @prop {string}  [title]                    - Main menu title
   * @prop {string}  [icon]                     - Main menu icon
   * @prop {RouteFn} [breadcrumbText]           - Property or function that returns the breadcrumb title
   * @prop {Tab[]}   [tabs]                     - Determines the tabs to displayed in the main toolbar extenstion slot
   */

  const routes = [
    {
      path: '/login',
      name: 'Login',
      component: Login,
      meta: {
        public: true
      }
    },
    {
      path: '/',
      component: Default,
      children: [
        {
          path: '',
          name: 'Home',
          component: Home,
          meta: {
            title: 'Home',
            namespaced: false,
            projectScope: false,
            breadcrumbText: routeTitle
          }
        },
        {
          path: 'account',
          name: 'Account',
          component: Account,
          meta: {
            title: 'Account',
            breadcrumbText: routeTitle,
            namespaced: false,
            projectScope: false
          }
        },
        {
          path: 'namespace/+',
          name: 'CreateProject',
          component: Home,
          meta: {
            title: 'Create Project',
            breadcrumbText: routeTitle,
            namespaced: false,
            projectScope: false
          }
        },
        {
          path: 'namespace/:namespace/shoots',
          component: PlaceholderComponent,
          meta: {
            menu: {
              title: 'Clusters',
              icon: 'mdi-hexagon-multiple'
            },
            namespaced: true,
            projectScope: false,
            title: 'Project Clusters',
            toRouteName: 'ShootList',
            breadcrumbText: routeTitle
          },
          children: [
            {
              path: '',
              name: 'ShootList',
              component: ShootList,
              meta: {
                namespaced: true,
                projectScope: false,
                title: 'Project Clusters'
              }
            },
            {
              path: '+',
              name: 'NewShoot',
              component: NewShoot,
              meta: {
                namespaced: true,
                projectScope: true,
                title: 'Create Cluster',
                toRouteName: 'NewShoot',
                breadcrumbText: routeTitle,
                tabs: newShootTabs
              }
            },
            {
              path: '+/yaml',
              name: 'NewShootEditor',
              component: NewShootEditor,
              meta: {
                namespaced: true,
                projectScope: true,
                title: 'Create Cluster Editor',
                breadcrumbText: routeTitle,
                tabs: newShootTabs
              }
            },
            {
              path: ':name',
              component: PlaceholderComponent,
              meta: {
                namespaced: true,
                projectScope: true,
                title: 'Cluster Details',
                toRouteName: 'ShootItem',
                breadcrumbText: routeParamName
              },
              children: [
                {
                  path: '',
                  name: 'ShootItem',
                  component: ShootDetails,
                  meta: {
                    namespaced: true,
                    projectScope: true,
                    title: 'Cluster Details',
                    tabs: shootItemTabs
                  }
                },
                {
                  path: 'term/:target',
                  name: 'ShootItemTerminal',
                  component: ShootItemTerminal,
                  meta: {
                    namespaced: true,
                    projectScope: true,
                    breadcrumbText: terminalBreadcrumbTitle,
                    tabs: shootItemTerminalTabs
                  },
                  beforeEnter: (to, from, next) => {
                    if (canUseTerminalFeature()) {
                      next()
                    } else {
                      next('/')
                    }
                  }
                }
              ]
            },
            {
              path: ':name/yaml',
              name: 'ShootDetailsEditor',
              component: ShootDetailsEditor,
              meta: {
                namespaced: true,
                projectScope: true,
                breadcrumbText: routeParamName,
                tabs: shootItemTabs
              }
            },
            {
              path: ':name/hibernation',
              name: 'ShootItemHibernationSettings',
              component: ShootDetails,
              meta: {
                namespaced: true,
                projectScope: true,
                breadcrumbText: routeParamName,
                tabs: shootItemTabs
              }
            }
          ]
        },
        {
          path: 'namespace/:namespace/secrets',
          component: PlaceholderComponent,
          meta: {
            menu: {
              title: 'Secrets',
              icon: 'mdi-key',
              get hidden () {
                return !canGetSecrets()
              }
            },
            namespaced: true,
            projectScope: true,
            title: 'Secrets',
            toRouteName: 'Secrets',
            breadcrumbText: routeTitle
          },
          children: [
            {
              path: '',
              name: 'Secrets',
              component: Secrets,
              meta: {
                namespaced: true,
                projectScope: true,
                title: 'Secrets'
              }
            },
            {
              path: ':name',
              name: 'Secret',
              component: Secrets,
              meta: {
                namespaced: true,
                projectScope: true,
                title: 'Secrets'
              }
            }
          ]
        },
        {
          path: 'namespace/:namespace/members',
          name: 'Members',
          component: Members,
          meta: {
            namespaced: true,
            projectScope: true,
            title: 'Members',
            menu: {
              title: 'Members',
              icon: 'mdi-account-multiple-outline'
            },
            breadcrumbText: routeTitle
          }
        },
        {
          path: 'namespace/:namespace/administration',
          name: 'Administration',
          component: Administration,
          meta: {
            namespaced: true,
            projectScope: true,
            title: 'Administration',
            menu: {
              title: 'Administration',
              icon: 'mdi-settings'
            },
            breadcrumbText: routeTitle
          }
        },
        {
          path: 'namespace/:namespace/term/garden',
          name: 'GardenTerminal',
          component: ShootItemTerminal,
          meta: {
            namespaced: true,
            projectScope: true,
            breadcrumbText: terminalBreadcrumbTitle,
            menu: {
              title: 'Garden Cluster',
              icon: 'mdi-console',
              get hidden () {
                return !hasGardenTerminalAccess()
              }
            }
          },
          beforeEnter: (to, from, next) => {
            if (hasGardenTerminalAccess()) {
              to.params.target = 'garden'
              next()
            } else {
              next('/')
            }
          }
        }
      ]
    }
  ]
  const zeroPoint = { x: 0, y: 0 }
  const scrollBehavior = (to, from, savedPosition) => savedPosition || zeroPoint
  const routerOptions = { mode, scrollBehavior, routes }

  /* automatic signout when token expires */
  let timeoutID
  store.watch((state, getters) => getters.userExpiresAt, expirationTime => {
    if (timeoutID) {
      clearTimeout(timeoutID)
    }
    const currentTime = Date.now()
    if (expirationTime) {
      if (expirationTime > currentTime) {
        const delay = expirationTime - currentTime
        console.log(`automatic signout ${moment.duration(delay).humanize(true)}`)
        timeoutID = setTimeout(() => userManager.signout(), delay)
      } else {
        console.error(`Expiration time of a new token is not expected to be in the past`)
      }
    }
  })

  /* navigation guards */
  async function ensureConfigurationLoaded (to, from, next) {
    try {
      if (!store.state.cfg) {
        await store.dispatch('fetchConfiguration')
      }
      next()
    } catch (err) {
      next(err)
    }
  }

  async function ensureUserAuthenticatedForNonPublicRoutes (to, from, next) {
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

  function ensureProjectsLoaded () {
    const projectList = store.getters.projectList
    if (projectList && projectList.length) {
      return Promise.resolve()
    }
    return store.dispatch('fetchProjects')
  }

  function ensureCloudProfilesLoaded () {
    const cloudProfileList = store.getters.cloudProfileList
    if (cloudProfileList && cloudProfileList.length) {
      return Promise.resolve()
    }
    return store.dispatch('fetchCloudProfiles')
  }

  async function ensureDataLoaded (to, from, next) {
    const meta = to.meta || {}
    if (meta.public) {
      return next()
    }
    if (to.name === 'Error') {
      return next()
    }
    try {
      await Promise.all([
        ensureCloudProfilesLoaded(),
        ensureProjectsLoaded(),
        store.dispatch('unsubscribeComments')
      ])
      const params = to.params || {}
      const query = to.query || {}
      const namespaces = store.getters.namespaces
      let namespace = params.namespace || query.namespace
      if (namespace !== store.state.namespace && (includes(namespaces, namespace) || namespace === '_all')) {
        await store.dispatch('setNamespace', namespace)
      }

      if (!store.state.namespace) {
        const namespaces = store.getters.namespaces
        namespace = includes(namespaces, 'garden') ? 'garden' : head(namespaces)
        await store.dispatch('setNamespace', namespace)
      }

      let redirectTo
      switch (to.name) {
        case 'Home': {
          if (namespace) {
            const name = 'ShootList'
            redirectTo = { name, params: { namespace } }
          }
          break
        }
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
          if (canGetSecrets()) {
            promises.push(store.dispatch('fetchInfrastructureSecrets'))
          }
          await Promise.all(promises)
          if (from.name !== 'NewShoot' && from.name !== 'NewShootEditor') {
            await store.dispatch('resetNewShootResource', { name: params.name, namespace })
          }
          break
        }
        case 'ShootList': {
          await store.dispatch('subscribeShoots', { name: params.name, namespace })
          break
        }
        case 'ShootItem': {
          const promises = [
            store.dispatch('subscribeShoot', { name: params.name, namespace }),
            store.dispatch('subscribeComments', { name: params.name, namespace })
          ]
          if (canGetSecrets()) {
            promises.push(store.dispatch('fetchInfrastructureSecrets')) // Required for purpose configuration
          }
          await Promise.all(promises)
          break
        }
        case 'ShootItemHibernationSettings': {
          await Promise.all([
            store.dispatch('subscribeShoot', { name: params.name, namespace }),
            store.dispatch('subscribeComments', { name: params.name, namespace })
          ])
          break
        }
        case 'ShootDetailsEditor': {
          await store.dispatch('subscribeShoot', { name: params.name, namespace })
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
        case 'Account': {
          if (query.namespace !== namespace) {
            const name = 'Account'
            redirectTo = { name, query: { namespace } }
          }
          break
        }
      }
      if (redirectTo) {
        next(redirectTo)
      } else {
        next()
      }
    } catch (err) {
      next(err)
    }
  }

  /* router */
  const router = new Router(routerOptions)

  /* register navigation guards */
  router.beforeEach(async (to, from, next) => {
    try {
      await store.dispatch('setLoading')
    } catch (err) {} // ignore
    next()
  })
  router.beforeEach(ensureConfigurationLoaded)
  router.beforeEach(ensureUserAuthenticatedForNonPublicRoutes)
  router.beforeEach(ensureDataLoaded)
  router.afterEach((to, from) => {
    try {
      store.dispatch('unsetLoading')
    } catch (err) {} // ignore
  })
  router.onError(async err => {
    console.error('Router error:', err.message)
    try {
      await Promise.all([
        store.dispatch('unsetLoading'),
        store.dispatch('setError', err)
      ])
    } catch (err) {} // ignore
  })
  return router
}
