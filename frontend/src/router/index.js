//
// Copyright 2018 by The Gardener Authors.
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

/* Layouts */
const Login = () => import('@/layouts/Login')
const Default = () => import('@/layouts/Default')

/* Pages */
const Home = () => import('@/pages/Home')
const ShootList = () => import('@/pages/ShootList')
const PlaceholderComponent = { template: '<router-view></router-view>' }
const ShootItem = () => import('@/pages/ShootItem')
const Secrets = () => import('@/pages/Secrets')
const Members = () => import('@/pages/Members')
const Account = () => import('@/pages/Account')
const Administration = () => import('@/pages/Administration')

Vue.use(Router)

export default function createRouter ({store, userManager}) {
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

  /* router */
  const mode = 'history'
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
            public: false,
            title: 'Home'
          }
        },
        {
          path: 'account',
          name: 'Account',
          component: Account,
          meta: {
            public: false,
            title: 'Account',
            breadcrumb: true
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
                public: false,
                namespaced: true,
                projectScope: false,
                title: 'Project Clusters'
              }
            },
            {
              path: ':name',
              name: 'ShootItem',
              component: ShootItem,
              meta: {
                public: false,
                namespaced: true,
                projectScope: false,
                title: 'Cluster Details',
                toRouteName: 'ShootList',
                breadcrumb: true
              }
            }
          ]
        },
        {
          path: 'namespace/:namespace/secrets',
          name: 'Secrets',
          component: Secrets,
          meta: {
            public: false,
            namespaced: true,
            projectScope: true,
            title: 'Secrets',
            menu: {
              title: 'Secrets',
              icon: 'mdi-key'
            },
            breadcrumb: true
          }
        },
        {
          path: 'namespace/:namespace/members',
          name: 'Members',
          component: Members,
          meta: {
            public: false,
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
            public: false,
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
  const routerOptions = {mode, scrollBehavior, routes}

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
        store.dispatch('setUser', user)
        if (isUserLoggedIn(user)) {
          return next()
        }
        return next({
          name: 'Login'
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
        ensureDomainsLoaded()
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
              return {name, params: {namespace}}
            }
            return undefined
          case 'Secrets':
            return Promise
              .all([
                store.dispatch('fetchInfrastructureSecrets')
              ])
              .then(() => undefined)
          case 'ShootList':
            if (namespace !== '_all') {
              return Promise.resolve(store.dispatch('fetchInfrastructureSecrets'))
                .then(() => undefined)
            }
            return undefined
          case 'ShootItem':
            return Promise
              .all([
                store.dispatch('fetchShoot', params.name)
              ])
              .then(() => undefined)
          case 'Members':
          case 'Administration':
            return Promise
              .all([
                store.dispatch('fetchMembers')
              ])
              .then(() => undefined)
          case 'Account':
            if (query.namespace !== namespace) {
              const name = 'Account'
              return {name, query: { namespace }}
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
