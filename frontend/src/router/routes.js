//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  newShootTabs,
  shootItemTabs
} from './tabs'

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
  notFoundBreadcrumbs
} from './breadcrumbs'

/* Layouts */
import Login from '@/views/Login'
import Default from '@/views/Default'

/* Pages */

import NotFound from '@/views/NotFound'
import Error from '@/views/Error'

import ProjectPlaceholder from '@/views/ProjectPlaceholder'
import NewShootEditor from '@/views/NewShootEditor'
import ShootItemPlaceholder from '@/views/ShootItemPlaceholder'
import ShootItemEditor from '@/views/ShootItemEditor'
import Account from '@/views/Account'
import Settings from '@/views/Settings'

const Members = () => import('@/views/Members')
const Home = () => import('@/views/Home')
const Secrets = () => import('@/views/Secrets')
const Administration = () => import('@/views/Administration')

const NewShoot = () => import('@/views/NewShoot')
const ShootList = () => import('@/views/ShootList')
const ShootItem = () => import('@/views/ShootItem')
const ShootItemTerminal = () => import('@/views/ShootItemTerminal')

const PlaceholderComponent = {
  render (createElement) {
    return createElement('router-view')
  }
}

export default function routes (context) {
  return [
    loginRoute(context, '/login'),
    errorRoute(context, '/error'),
    defaultHierarchy(context, '/')
  ]
}

/* Default Hierachy "/" */
function defaultHierarchy (context, path) {
  const children = [
    homeRoute(context, ''),
    accountRoute(context, 'account'),
    settingsRoute(context, 'settings'),
    projectsRoute(context, 'namespace'),
    newProjectRoute(context, 'namespace/+'),
    projectHierarchy(context, 'namespace/:namespace'),
    {
      path: '*',
      component: NotFound,
      meta: {
        namespaced: false,
        projectScope: false,
        breadcrumbs: notFoundBreadcrumbs
      }
    }
  ]
  return {
    path,
    component: Default,
    children
  }
}

/* Project Hierachy "/namespace/:namespace" */
function projectHierarchy (context, path) {
  return {
    path,
    component: ProjectPlaceholder,
    children: [
      { path: '', redirect: 'shoots' },
      shootListHierarchy(context, 'shoots'),
      secretListRoute(context, 'secrets'),
      secretItemRoute(context, 'secrets/:name'),
      membersRoute(context, 'members'),
      administrationRoute(context, 'administration'),
      { path: 'term', redirect: 'term/garden' },
      gardenTerminalRoute(context, 'term/garden'),
      {
        path: '*',
        component: NotFound,
        meta: {
          breadcrumbs: notFoundBreadcrumbs
        }
      }
    ]
  }
}

/* Shoot List Hierachy "/namespace/:namespace/shoots" */
function shootListHierarchy (context, path) {
  return {
    path,
    component: PlaceholderComponent,
    children: [
      shootListRoute(context, ''),
      newShootRoute(context, '+'),
      newShootEditorRoute(context, '+/yaml'),
      shootItemHierarchy(context, ':name')
    ]
  }
}

/* Shoot Item Hierachy "/namespace/:namespace/shoots/:name" */
function shootItemHierarchy (context, path) {
  return {
    path,
    component: ShootItemPlaceholder,
    children: [
      shootItemRoute(context, ''),
      shootItemEditorRoute(context, 'yaml'),
      shootItemHibernationRoute(context, 'hibernation'),
      shootItemTerminalRoute(context, 'term'),
      {
        path: '*',
        component: NotFound,
        meta: {
          breadcrumbs: shootItemBreadcrumbs
        }
      }
    ]
  }
}

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

function loginRoute (context, path) {
  return {
    path,
    name: 'Login',
    component: Login,
    meta: {
      public: true
    }
  }
}

function errorRoute (context, path) {
  return {
    path,
    name: 'Error',
    component: Error,
    meta: {
      public: true
    }
  }
}

function homeRoute ({ getters, dispatch }, path) {
  return {
    path,
    name: 'Home',
    component: Home,
    meta: {
      namespaced: false,
      projectScope: false,
      breadcrumbs: homeBreadcrumbs
    },
    async beforeEnter (to, from, next) {
      const namespace = getters.defaultNamespace
      if (namespace) {
        return next({
          name: 'ShootList',
          params: { namespace }
        })
      }
      next()
    }
  }
}

function newProjectRoute ({ state, getters, commit }, path) {
  return {
    path,
    name: 'NewProject',
    component: Home,
    meta: {
      namespaced: false,
      projectScope: false,
      breadcrumbs: newProjectBreadcrumbs
    },
    beforeEnter (to, from, next) {
      const defaultNamespace = getters.defaultNamespace
      if (!state.namespace && defaultNamespace) {
        commit('SET_NAMESPACE', defaultNamespace)
      }
      next()
    }
  }
}

function projectsRoute ({ state, getters }, path) {
  return {
    path,
    beforeEnter (to, from, next) {
      const namespace = state.namespace || getters.defaultNamespace
      if (namespace) {
        return next({
          name: 'ShootList',
          params: { namespace }
        })
      }
      next()
    }
  }
}

function accountRoute ({ state, getters }, path) {
  return {
    path,
    name: 'Account',
    component: Account,
    meta: {
      namespaced: false,
      projectScope: false,
      breadcrumbs: accountBreadcrumbs
    },
    beforeEnter (to, from, next) {
      const namespace = state.namespace || getters.defaultNamespace
      if (!to.query.namespace && namespace) {
        return next({
          name: 'Account',
          query: { namespace, ...to.query }
        })
      }
      next()
    }
  }
}

function settingsRoute ({ state, getters }, path) {
  return {
    path,
    name: 'Settings',
    component: Settings,
    meta: {
      namespaced: false,
      projectScope: false,
      breadcrumbs: settingsBreadcrumbs
    },
    beforeEnter (to, from, next) {
      const namespace = state.namespace || getters.defaultNamespace
      if (!to.query.namespace && namespace) {
        return next({
          name: 'Settings',
          query: { namespace, ...to.query }
        })
      }
      next()
    }
  }
}

function shootListRoute (context, path) {
  return {
    path,
    name: 'ShootList',
    component: ShootList,
    meta: {
      menu: {
        title: 'Clusters',
        icon: 'mdi-hexagon-multiple'
      },
      projectScope: false,
      breadcrumbs: shootListBreadcrumbs
    }
  }
}

function newShootRoute (context, path) {
  return {
    path,
    name: 'NewShoot',
    component: NewShoot,
    meta: {
      breadcrumbs: newShootBreadcrumbs,
      tabs: newShootTabs
    }
  }
}

function newShootEditorRoute (context, path) {
  return {
    path,
    name: 'NewShootEditor',
    component: NewShootEditor,
    meta: {
      breadcrumbs: newShootEditorBreadcrumbs,
      tabs: newShootTabs
    }
  }
}

function shootItemRoute (context, path) {
  return {
    path,
    name: 'ShootItem',
    component: ShootItem,
    meta: {
      breadcrumbs: shootItemBreadcrumbs,
      tabs: shootItemTabs
    }
  }
}

function shootItemEditorRoute (context, path) {
  return {
    path,
    name: 'ShootItemEditor',
    component: ShootItemEditor,
    meta: {
      breadcrumbs: shootItemBreadcrumbs,
      tabs: shootItemTabs
    }
  }
}

function shootItemHibernationRoute (context, path) {
  return {
    path,
    name: 'ShootItemHibernationSettings',
    component: ShootItem,
    meta: {
      breadcrumbs: shootItemBreadcrumbs,
      tabs: shootItemTabs
    }
  }
}

function shootItemTerminalRoute ({ getters }, path) {
  return {
    path,
    name: 'ShootItemTerminal',
    component: ShootItemTerminal,
    meta: {
      breadcrumbs: shootItemTerminalBreadcrumbs
    },
    beforeEnter (to, from, next) {
      if (getters.isTerminalEnabled && getters.canCreateTerminals) {
        next()
      } else {
        next('/')
      }
    }
  }
}

function secretListRoute ({ getters }, path) {
  return {
    path,
    name: 'Secrets',
    component: Secrets,
    meta: {
      menu: {
        title: 'Secrets',
        icon: 'mdi-key',
        get hidden () {
          return !getters.canGetSecrets
        }
      },
      breadcrumbs: secretsBreadcrumbs
    }
  }
}

function secretItemRoute (context, path) {
  return {
    path,
    name: 'Secret',
    component: Secrets,
    meta: {
      breadcrumbs: secretItemBreadcrumbs
    }
  }
}

function membersRoute (context, path) {
  return {
    path,
    name: 'Members',
    component: Members,
    meta: {
      menu: {
        title: 'Members',
        icon: 'mdi-account-multiple-outline'
      },
      breadcrumbs: membersBreadcrumbs
    }
  }
}

function administrationRoute (context, path) {
  return {
    path,
    name: 'Administration',
    component: Administration,
    meta: {
      menu: {
        title: 'Administration',
        icon: 'mdi-cog'
      },
      breadcrumbs: administrationBreadcrumbs
    }
  }
}

function gardenTerminalRoute ({ getters }, path) {
  return {
    path,
    name: 'GardenTerminal',
    component: ShootItemTerminal,
    meta: {
      menu: {
        title: 'Garden Cluster',
        icon: 'mdi-console',
        get hidden () {
          return !(getters.hasGardenTerminalAccess && getters.isAdmin)
        }
      },
      breadcrumbs: terminalBreadcrumbs
    },
    beforeEnter (to, from, next) {
      if (getters.hasGardenTerminalAccess) {
        to.params.target = 'garden'
        next()
      } else {
        next('/')
      }
    }
  }
}
