//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

import { signinCallback, signout, isUserLoggedIn } from '@/utils/auth'
import includes from 'lodash/includes'
import head from 'lodash/head'
import concat from 'lodash/concat'

/* Layouts */
const Login = () => import('@/layouts/Login')
const Default = () => import('@/layouts/Default')

/* Pages */
const Home = () => import('@/pages/Home')
const ShootList = () => import('@/pages/ShootList')
const PlaceholderComponent = { template: '<router-view></router-view>' }
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
    template: '<div/>',
    beforeRouteEnter (to, from, next) {
      signout(userManager)
        .then(() => next('/login'), err => next(err))
    }
  }

  const Callback = {
    template: '<div/>',
    beforeRouteEnter (to, from, next) {
      return signinCallback(userManager)
        .then(user => store.dispatch('setUser', user))
        .then(() => next('/'), err => next(err))
    },
    mounted () {
      // eslint-disable-next-line lodash/prefer-lodash-method
      this.$router.replace('/')
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

  /**
   * Route Meta fields type definition
   * @typedef {Object} RouteMeta
   * @prop {boolean} [public]       - Determines whether route needs authorization.
   * @prop {boolean} [namespaced]   - Determines whether route is namespace specific and has namespace in path.
   * @prop {boolean} [projectScope] - Determines whether route can be accessed in context of mutiple projects (_all).
   * @prop {string}  [toRouteName]  - Sets "to" target name in case navigation is triggered (e.g. due to project change),
   *                                  this way it is possible to e.g. navigate back to shoot list from shoot details on project change.
   *                                  Furthermore, it is possible to set a default child route for a top level item.
   * @prop {string}  [title]        - Main menu title.
   * @prop {string}  [icon]         - Main menu icon.
   * @prop {boolean} [breadcrumb]   - Determines if breadcrumb is visible for route.
   * @prop {Tab[]}   [tabs]         - Determines the tabs to displayed in the main toolbar extenstion slot.
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
            projectScope: false
          }
        },
        {
          path: 'account',
          name: 'Account',
          component: Account,
          meta: {
            title: 'Account',
            breadcrumb: true,
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
            breadcrumb: true
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
                toRouteName: 'ShootList',
                breadcrumb: true,
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
                title: 'Cluster Editor',
                toRouteName: 'ShootList',
                breadcrumb: true,
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
            breadcrumb: true
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
                title: 'Secrets',
                toRouteName: 'Secrets'
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
            breadcrumb: true
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
            breadcrumb: true
          }
        }
      ]
    }
  ]
  const zeroPoint = { x: 0, y: 0 }
  const scrollBehavior = (to, from, savedPosition) => savedPosition || zeroPoint
  const routerOptions = { mode, scrollBehavior, routes }

  /* navigation guards */
  function ensureConfigurationLoaded (to, from, next) {
    if (store.state.cfg) {
      return next()
    }
    return store
      .dispatch('fetchConfiguration')
      .then(() => next(), err => next(err))
  }

  function ensureUserAuthenticatedForNonPublicRoutes (to, from, next) {
    const meta = to.meta || {}
    if (meta.public) {
      return next()
    }
    const user = store.state.user
    if (isUserLoggedIn(user)) {
      return next()
    }
    userManager
      .getUser()
      .then(user => {
        store.dispatch('setUser', user).then(() => {
          if (isUserLoggedIn(user)) {
            return next()
          }
          return next({
            name: 'Login'
          })
        })
      })
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
          const namespace = head(namespaces)
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
          case 'ShootItemEditor':
            return Promise
              .all([
                store.dispatch('subscribeShoot', { name: params.name, namespace }),
                store.dispatch('subscribeComments', { name: params.name, namespace })
              ])
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
    console.log('Router beforeEach')
    store.dispatch('setLoading')
      .then(() => next(), () => next())
  })
  router.beforeEach(ensureConfigurationLoaded)
  router.beforeEach(ensureUserAuthenticatedForNonPublicRoutes)
  router.beforeEach(ensureDataLoaded)
  router.afterEach((to, from) => {
    console.log('Router afterEach')
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
