//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  newShootTabs,
  shootItemTabs,
} from '../../src/router/tabs'

import {
  homeBreadcrumbs,
  newProjectBreadcrumbs,
  accountBreadcrumbs,
  settingsBreadcrumbs,
  shootListBreadcrumbs,
  shootItemBreadcrumbs,
  shootItemTerminalBreadcrumbs,
  secretItemBreadcrumbs,
  secretsBreadcrumbs,
  newShootBreadcrumbs,
  newShootEditorBreadcrumbs,
  administrationBreadcrumbs,
  membersBreadcrumbs,
  terminalBreadcrumbs,
  notFoundBreadcrumbs,
} from '../../src/router/breadcrumbs'

/* Layouts */
import Login from '@/views/Login.vue'
import Default from '@/views/Default.vue'

/* Pages */
import NotFound from '@/views/NotFound.vue'
import Error from '@/views/ErrorView.vue'

import ProjectPlaceholder from '@/views/ProjectPlaceholder.vue'
import NewShootEditor from '@/views/NewShootEditor.vue'
import ShootItemPlaceholder from '@/views/ShootItemPlaceholder.vue'
import ShootItemEditor from '@/views/ShootItemEditor.vue'
import Account from '@/views/Account.vue'
import Settings from '@/views/Settings.vue'

import RouterView from '@/components/RouterView.vue'

const Members = () => import('@/views/Members.vue')
const Home = () => import('@/views/Home.vue')
const Secrets = () => import('@/views/Secrets.vue')
const Administration = () => import('@/views/Administration.vue')

const NewShoot = () => import('@/views/NewShoot.vue')
const ShootList = () => import('@/views/ShootList.vue')
const ShootItem = () => import('@/views/ShootItem.vue')
const ShootItemTerminal = () => import('@/views/ShootItemTerminal.vue')

function createRoutes (store) {
  return [
    loginRoute(store, '/login'),
    errorRoute(store, '/error'),
    defaultHierarchy(store, '/'),
  ]
}

/* Default Hierachy "/" */
function defaultHierarchy (store, path) {
  const children = [
    homeRoute(store, ''),
    accountRoute(store, 'account'),
    settingsRoute(store, 'settings'),
    projectsRoute(store, 'namespace'),
    newProjectRoute(store, 'namespace/+'),
    projectHierarchy(store, 'namespace/:namespace'),
    {
      path: '*',
      component: NotFound,
      meta: {
        namespaced: false,
        projectScope: false,
        breadcrumbs: notFoundBreadcrumbs,
      },
    },
  ]
  return {
    path,
    component: Default,
    children,
  }
}

/* Project Hierachy "/namespace/:namespace" */
function projectHierarchy (store, path) {
  return {
    path,
    component: ProjectPlaceholder,
    children: [
      { path: '', redirect: 'shoots' },
      shootListHierarchy(store, 'shoots'),
      secretListRoute(store, 'secrets'),
      secretItemRoute(store, 'secrets/:name'),
      membersRoute(store, 'members'),
      administrationRoute(store, 'administration'),
      { path: 'term', redirect: 'term/garden' },
      gardenTerminalRoute(store, 'term/garden'),
      {
        path: '*',
        component: NotFound,
        meta: {
          breadcrumbs: notFoundBreadcrumbs,
        },
      },
    ],
  }
}

/* Shoot List Hierachy "/namespace/:namespace/shoots" */
function shootListHierarchy (store, path) {
  return {
    path,
    component: RouterView,
    children: [
      shootListRoute(store, ''),
      newShootRoute(store, '+'),
      newShootEditorRoute(store, '+/yaml'),
      shootItemHierarchy(store, ':name'),
    ],
  }
}

/* Shoot Item Hierachy "/namespace/:namespace/shoots/:name" */
function shootItemHierarchy (store, path) {
  return {
    path,
    component: ShootItemPlaceholder,
    children: [
      shootItemRoute(store, ''),
      shootItemEditorRoute(store, 'yaml'),
      shootItemHibernationRoute(store, 'hibernation'),
      shootItemTerminalRoute(store, 'term'),
      {
        path: '*',
        component: NotFound,
        meta: {
          breadcrumbs: shootItemBreadcrumbs,
        },
      },
    ],
  }
}

/**
   * Route Meta fields type definition
   * @typedef {Object} RouteMeta
   * @prop {boolean} [public]                   - Determines whether route needs authorization
   * @prop {boolean} [namespaced]               - Determines whether route is namespace specific and has namespace in path
   * @prop {boolean} [projectScope]             - Determines whether route can be accessed in store of mutiple projects (_all)
   * @prop {string}  [toRouteName]              - It is possible to set a default child route for a top level item (like the PlaceholderComponent)
   * @prop {string}  [title]                    - Main menu title
   * @prop {string}  [icon]                     - Main menu icon
   * @prop {RouteFn} [breadcrumbText]           - Property or function that returns the breadcrumb title
   * @prop {Tab[]}   [tabs]                     - Determines the tabs to displayed in the main toolbar extenstion slot
   */

export function loginRoute (store, path) {
  return {
    path,
    name: 'Login',
    component: Login,
    meta: {
      public: true,
    },
  }
}

export function errorRoute (store, path) {
  return {
    path,
    name: 'Error',
    component: Error,
    meta: {
      public: true,
    },
  }
}

export function homeRoute (store, path) {
  return {
    path,
    name: 'Home',
    component: Home,
    meta: {
      namespaced: false,
      projectScope: false,
      breadcrumbs: homeBreadcrumbs,
    },
    async beforeEnter (to, from, next) {
      const namespace = store.defaultNamespace
      if (namespace) {
        return next({
          name: 'ShootList',
          params: { namespace },
        })
      }
      next()
    },
  }
}

export function newProjectRoute (store, path) {
  return {
    path,
    name: 'NewProject',
    component: Home,
    meta: {
      namespaced: false,
      projectScope: false,
      breadcrumbs: newProjectBreadcrumbs,
    },
    beforeEnter (to, from, next) {
      const defaultNamespace = store.defaultNamespace
      if (!store.namespace && defaultNamespace) {
        store.namespace = defaultNamespace
      }
      next()
    },
  }
}

function projectsRoute (store, path) {
  return {
    path,
    beforeEnter (to, from, next) {
      const namespace = store.namespace || store.defaultNamespace
      if (namespace) {
        return next({
          name: 'ShootList',
          params: { namespace },
        })
      }
      next()
    },
  }
}

export function accountRoute (store, path) {
  return {
    path,
    name: 'Account',
    component: Account,
    meta: {
      namespaced: false,
      projectScope: false,
      breadcrumbs: accountBreadcrumbs,
    },
    beforeEnter (to, from, next) {
      const namespace = store.namespace || store.defaultNamespace
      if (!to.query.namespace && namespace) {
        return next({
          name: 'Account',
          query: { namespace, ...to.query },
        })
      }
      next()
    },
  }
}

export function settingsRoute (store, path) {
  return {
    path,
    name: 'Settings',
    component: Settings,
    meta: {
      namespaced: false,
      projectScope: false,
      breadcrumbs: settingsBreadcrumbs,
    },
    beforeEnter (to, from, next) {
      const namespace = store.namespace || store.defaultNamespace
      if (!to.query.namespace && namespace) {
        return next({
          name: 'Settings',
          query: { namespace, ...to.query },
        })
      }
      next()
    },
  }
}

export function shootListRoute (store, path) {
  return {
    path,
    name: 'ShootList',
    component: ShootList,
    meta: {
      menu: {
        title: 'Clusters',
        icon: 'mdi-hexagon-multiple',
      },
      projectScope: false,
      breadcrumbs: shootListBreadcrumbs,
    },
  }
}

export function newShootRoute (store, path) {
  return {
    path,
    name: 'NewShoot',
    component: NewShoot,
    meta: {
      breadcrumbs: newShootBreadcrumbs,
      tabs: newShootTabs,
    },
  }
}

function newShootEditorRoute (store, path) {
  return {
    path,
    name: 'NewShootEditor',
    component: NewShootEditor,
    meta: {
      breadcrumbs: newShootEditorBreadcrumbs,
      tabs: newShootTabs,
    },
  }
}

export function shootItemRoute (store, path) {
  return {
    path,
    name: 'ShootItem',
    component: ShootItem,
    meta: {
      breadcrumbs: shootItemBreadcrumbs,
      tabs: shootItemTabs,
    },
  }
}

export function shootItemEditorRoute (store, path) {
  return {
    path,
    name: 'ShootItemEditor',
    component: ShootItemEditor,
    meta: {
      breadcrumbs: shootItemBreadcrumbs,
      tabs: shootItemTabs,
    },
  }
}

export function shootItemHibernationRoute (store, path) {
  return {
    path,
    name: 'ShootItemHibernationSettings',
    component: ShootItem,
    meta: {
      breadcrumbs: shootItemBreadcrumbs,
      tabs: shootItemTabs,
    },
  }
}

function shootItemTerminalRoute (store, path) {
  return {
    path,
    name: 'ShootItemTerminal',
    component: ShootItemTerminal,
    meta: {
      breadcrumbs: shootItemTerminalBreadcrumbs,
    },
    beforeEnter (to, from, next) {
      if (store.isTerminalEnabled && store.canCreateTerminals) {
        next()
      } else {
        next('/')
      }
    },
  }
}

export function secretListRoute (store, path) {
  return {
    path,
    name: 'Secrets',
    component: Secrets,
    meta: {
      menu: {
        title: 'Secrets',
        icon: 'mdi-key',
        get hidden () {
          return !store.canGetSecrets
        },
      },
      breadcrumbs: secretsBreadcrumbs,
    },
  }
}

export function secretItemRoute (store, path) {
  return {
    path,
    name: 'Secret',
    component: Secrets,
    meta: {
      breadcrumbs: secretItemBreadcrumbs,
    },
  }
}

function membersRoute (store, path) {
  return {
    path,
    name: 'Members',
    component: Members,
    meta: {
      menu: {
        title: 'Members',
        icon: 'mdi-account-multiple-outline',
      },
      breadcrumbs: membersBreadcrumbs,
    },
  }
}

export function administrationRoute (store, path) {
  return {
    path,
    name: 'Administration',
    component: Administration,
    meta: {
      menu: {
        title: 'Administration',
        icon: 'mdi-cog',
      },
      breadcrumbs: administrationBreadcrumbs,
    },
  }
}

export function gardenTerminalRoute (store, path) {
  return {
    path,
    name: 'GardenTerminal',
    component: ShootItemTerminal,
    meta: {
      menu: {
        title: 'Garden Cluster',
        icon: 'mdi-console',
        get hidden () {
          return !(store.hasGardenTerminalAccess && store.isAdmin)
        },
      },
      breadcrumbs: terminalBreadcrumbs,
    },
    beforeEnter (to, from, next) {
      if (store.hasGardenTerminalAccess) {
        to.params.target = 'garden'
        next()
      } else {
        next('/')
      }
    },
  }
}

export default createRoutes
