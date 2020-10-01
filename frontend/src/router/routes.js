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

import {
  newShootTabs,
  shootItemTabs
} from './tabs'

import {
  homeBreadcrumbs,
  newProjectBreadcrumbs,
  accountBreadcrumbs,
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
const Login = () => import('@/views/Login')
const Default = () => import('@/views/Default')

/* Pages */
const Home = () => import('@/views/Home')
const NewShoot = () => import('@/views/NewShoot')
const ShootList = () => import('@/views/ShootList')
const ShootItemTerminal = () => import('@/views/ShootItemTerminal')
const ShootItem = () => import('@/views/ShootItem')
const ShootItemEditor = () => import('@/views/ShootItemEditor')
const NewShootEditor = () => import('@/views/NewShootEditor')
const Secrets = () => import('@/views/Secrets')
const Members = () => import('@/views/Members')
const Account = () => import('@/views/Account')
const Administration = () => import('@/views/Administration')
const ProjectPlaceholder = () => import('@/views/ProjectPlaceholder')
const ShootItemPlaceholder = () => import('@/views/ShootItemPlaceholder')
const NotFound = () => import('@/views/NotFound')
const Error = () => import('@/views/Error')

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
      try {
        await dispatch('refreshSubjectRules', namespace) // namespace may also be undefined and will be defaulted
      } catch (error) {
        console.error('could not refresh subject rules', error.message)
      }

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
          return !getters.hasGardenTerminalAccess
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
