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

import includes from 'lodash/includes'
import head from 'lodash/head'
import get from 'lodash/get'
import concat from 'lodash/concat'

/* Layouts */
const Login = () => import('@/layouts/Login')
const Default = () => import('@/layouts/Default')

/* Pages */
const Home = () => import('@/pages/Home')
const ShootList = () => import('@/pages/ShootList')

const ShootItemCards = () => import('@/pages/ShootItemCards')
const ShootItemEditor = () => import('@/pages/ShootItemEditor')
const Secrets = () => import('@/pages/Secrets')
const Members = () => import('@/pages/Members')
const Account = () => import('@/pages/Account')
const Administration = () => import('@/pages/Administration')

Vue.use(Router)

export default function createRouter ({ store, userManager }) {
  /* technical components */
  const Logout = {
    beforeRouteEnter (to, from, next) {
      userManager.signout()
      next('/login')
    },
    render (createElement, { data, children } = {}) {
      return createElement('div', data, children)
    }
  }

  const Callback = {
    async beforeRouteEnter (to, from, next) {
      try {
        const user = userManager.signinRedirectCallback(to)
        await store.dispatch('setUser', user)
        next('/')
      } catch (err) {
        next(err)
      }
    },
    mounted () {
      // eslint-disable-next-line lodash/prefer-lodash-method
      this.$router.replace('/')
    },
    render (createElement, { data, children } = {}) {
      return createElement('div', data, children)
    }
  }

  const PlaceholderComponent = {
    render (createElement) {
      return createElement('router-view')
    }
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
      title: 'Overview',
      to: ({ params }) => {
        return {
          name: 'ShootItem',
          params
        }
      }
    },
    {
      title: 'YAML',
      to: ({ params }) => {
        return {
          name: 'ShootItemEditor',
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
   * @prop {RouteFn} [breadcrumbTextFn]         - Function that returns the breadcrumb title
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
      path: '/logout',
      name: 'Logout',
      component: Logout,
      meta: {
        public: true
      }
    },
    {
      path: '/callback',
      component: Callback,
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
            breadcrumbTextFn: routeTitle
          }
        },
        {
          path: 'account',
          name: 'Account',
          component: Account,
          meta: {
            title: 'Account',
            breadcrumbTextFn: routeTitle,
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
            breadcrumbTextFn: routeTitle
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
              path: ':name',
              name: 'ShootItem',
              component: ShootItemCards,
              meta: {
                namespaced: true,
                projectScope: true,
                title: 'Cluster Details',
                toRouteName: 'ShootItem',
                breadcrumbTextFn: routeParamName,
                tabs: shootItemTabs
              }
            },
            {
              path: ':name/yaml',
              name: 'ShootItemEditor',
              component: ShootItemEditor,
              meta: {
                namespaced: true,
                projectScope: true,
                breadcrumbTextFn: routeParamName,
                tabs: shootItemTabs
              }
            },
            {
              path: ':name/hibernation',
              name: 'ShootItemHibernationSettings',
              component: ShootItemCards,
              meta: {
                namespaced: true,
                projectScope: true,
                breadcrumbTextFn: routeParamName,
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
              icon: 'mdi-key'
            },
            namespaced: true,
            projectScope: true,
            title: 'Secrets',
            toRouteName: 'Secrets',
            breadcrumbTextFn: routeTitle
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
            breadcrumbTextFn: routeTitle
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
            breadcrumbTextFn: routeTitle
          }
        }
      ]
    }
  ]
  const zeroPoint = { x: 0, y: 0 }
  const scrollBehavior = (to, from, savedPosition) => savedPosition || zeroPoint
  const routerOptions = { mode, scrollBehavior, routes }

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
      const meta = to.meta || {}
      if (meta.public) {
        return next()
      }
      if (userManager.isUserLoggedIn()) {
        if (!store.state.user) {
          await store.dispatch('setUser', userManager.getUser())
        }
        return next()
      }
      return next({
        name: 'Login'
      })
    } catch (err) {
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

  function ensureDomainsLoaded () {
    const domainList = store.getters.domainList
    if (domainList && domainList.length) {
      return Promise.resolve()
    }
    return store.dispatch('fetchDomains')
  }

  function ensureDataLoaded (to, from, next) {
    const meta = to.meta || {}
    if (meta.public) {
      return next()
    }
    if (to.name === 'Error') {
      return next()
    }
    Promise
      .all([
        ensureCloudProfilesLoaded(),
        ensureProjectsLoaded(),
        ensureDomainsLoaded(),
        store.dispatch('unsubscribeComments')
      ])
      .then(() => {
        const params = to.params || {}
        const query = to.query || {}
        const namespaces = store.getters.namespaces
        const namespace = params.namespace || query.namespace
        if (namespace !== store.state.namespace && (includes(namespaces, namespace) || namespace === '_all')) {
          return store.dispatch('setNamespace', namespace)
        }
      })
      .then(() => {
        if (!store.state.namespace) {
          const namespaces = store.getters.namespaces
          const namespace = includes(namespaces, 'garden') ? 'garden' : head(namespaces)
          return store.dispatch('setNamespace', namespace)
        }
      })
      .then(() => {
        const params = to.params || {}
        const query = to.query || {}
        const namespace = store.state.namespace
        switch (to.name) {
          case 'Home':
            if (namespace) {
              const name = 'ShootList'
              return { name, params: { namespace } }
            }
            return undefined
          case 'Secrets':
          case 'Secret':
            return Promise
              .all([
                store.dispatch('fetchInfrastructureSecrets'),
                store.dispatch('subscribeShoots')
              ])
              .then(() => undefined)
          case 'ShootList':
            const promises = []
            concat(promises, store.dispatch('subscribeShoots'))
            if (namespace !== '_all') {
              concat(promises, store.dispatch('fetchInfrastructureSecrets'))
            }
            return Promise
              .all(promises)
              .then(() => undefined)
          case 'ShootItem':
          case 'ShootItemHibernationSettings':
            return Promise
              .all([
                store.dispatch('subscribeShoot', { name: params.name, namespace }),
                store.dispatch('subscribeComments', { name: params.name, namespace })
              ])
              .then(() => undefined)
          case 'ShootItemEditor':
            return store.dispatch('subscribeShoot', { name: params.name, namespace })
              .then(() => undefined)
          case 'Members':
          case 'Administration':
            return Promise
              .all([
                store.dispatch('fetchMembers'),
                store.dispatch('subscribeShoots')
              ])
              .then(() => undefined)
          case 'Account':
            if (query.namespace !== namespace) {
              const name = 'Account'
              return { name, query: { namespace } }
            }
            return undefined
          default:
            return undefined
        }
      })
      .then(redirectTo => {
        if (redirectTo) {
          return next(redirectTo)
        }
        next()
      })
      .catch(err => next(err))
  }

  /* router */
  const router = new Router(routerOptions)

  /* register navigation guards */
  router.beforeEach((to, from, next) => {
    store.dispatch('setLoading').then(() => next(), () => next())
  })
  router.beforeEach(ensureConfigurationLoaded)
  router.beforeEach(ensureUserAuthenticatedForNonPublicRoutes)
  router.beforeEach(ensureDataLoaded)
  router.afterEach((to, from) => {
    store.dispatch('unsetLoading')
  })
  router.onError(err => {
    console.error('Router error:', err.message)
    Promise.all([
      store.dispatch('unsetLoading'),
      store.dispatch('setError', err)
    ])
  })
  return router
}
