//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  newShootTabs,
  shootItemTabs,
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
  notFoundBreadcrumbs,
} from './breadcrumbs'

/* Layouts */
import GLogin from '@/layouts/GLogin.vue'
import GDefault from '@/layouts/GDefault.vue'

/* Views */
import GError from '@/views/GError.vue'
import GNotFound from '@/views/GNotFound.vue'
import GProjectPlaceholder from '@/views/GProjectPlaceholder.vue'
import GNewShootEditor from '@/views/GNewShootEditor.vue'
import GShootItemPlaceholder from '@/views/GShootItemPlaceholder.vue'
import GShootItemEditor from '@/views/GShootItemEditor.vue'
import GAccount from '@/views/GAccount.vue'
import GSettings from '@/views/GSettings.vue'

/* Components */
import GRouterView from '@/components/GRouterView.vue'

const GMembers = () => import('@/views/GMembers.vue')
const GHome = () => import('@/views/GHome.vue')
const GSecrets = () => import('@/views/GSecrets.vue')
const GAdministration = () => import('@/views/GAdministration.vue')

const GNewShoot = () => import('@/views/GNewShoot.vue')
const GShootList = () => import('@/views/GShootList.vue')
const GShootItem = () => import('@/views/GShootItem.vue')
const GShootItemTerminal = () => import('@/views/GShootItemTerminal.vue')

export function createRoutes (context) {
  const {
    appStore,
    authnStore,
    authzStore,
    projectStore,
  } = context

  return [
    loginRoute('/login'),
    errorRoute('/error'),
    defaultHierarchy('/'),
  ]

  /* Default Hierachy "/" */
  function defaultHierarchy (path) {
    const children = [
      homeRoute(''),
      accountRoute('account'),
      settingsRoute('settings'),
      projectsRoute('namespace'),
      newProjectRoute('namespace/+'),
      projectHierarchy('namespace/:namespace'),
      {
        path: ':pathMatch(.*)*',
        component: GNotFound,
        meta: {
          namespaced: false,
          projectScope: false,
          breadcrumbs: notFoundBreadcrumbs,
        },
      },
    ]
    return {
      path,
      component: GDefault,
      children,
    }
  }

  /* Project Hierachy "/namespace/:namespace" */
  function projectHierarchy (path) {
    return {
      path,
      component: GProjectPlaceholder,
      children: [
        { path: '', redirect: 'shoots' },
        shootListHierarchy('shoots'),
        secretListRoute('secrets'),
        secretItemRoute('secrets/:name'),
        membersRoute('members'),
        administrationRoute('administration'),
        { path: 'term', redirect: 'term/garden' },
        gardenTerminalRoute('term/garden'),
        {
          path: ':pathMatch(.*)*',
          component: GNotFound,
          meta: {
            breadcrumbs: notFoundBreadcrumbs,
          },
        },
      ],
    }
  }

  /* Shoot List Hierachy "/namespace/:namespace/shoots" */
  function shootListHierarchy (path) {
    return {
      path,
      component: GRouterView,
      children: [
        shootListRoute(''),
        newShootRoute('+'),
        newShootEditorRoute('+/yaml'),
        shootItemHierarchy(':name'),
      ],
    }
  }

  /* Shoot Item Hierachy "/namespace/:namespace/shoots/:name" */
  function shootItemHierarchy (path) {
    return {
      path,
      component: GShootItemPlaceholder,
      children: [
        shootItemRoute(''),
        shootItemEditorRoute('yaml'),
        shootItemHibernationRoute('hibernation'),
        shootItemTerminalRoute('term'),
        {
          path: ':pathMatch(.*)*',
          component: GNotFound,
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

  function loginRoute (path) {
    return {
      path,
      name: 'Login',
      component: GLogin,
      async beforeEnter (to) {
        if (/^#.+/.test(to.hash)) {
          const searchParams = new URLSearchParams(to.hash.substring(1))
          if (searchParams.has('error')) {
            appStore.alert = {
              type: 'error',
              title: searchParams.get('title') ?? 'Login Error',
              message: searchParams.get('error'),
            }
            return {
              ...to,
              hash: '',
            }
          }
        }
      },
      meta: {
        public: true,
      },
    }
  }

  function errorRoute (path) {
    return {
      path,
      name: 'Error',
      component: GError,
      meta: {
        public: true,
      },
    }
  }

  function homeRoute (path) {
    return {
      path,
      name: 'Home',
      component: GHome,
      meta: {
        namespaced: false,
        projectScope: false,
        breadcrumbs: homeBreadcrumbs,
      },
      async beforeEnter (to, from, next) {
        const namespace = projectStore.defaultNamespace
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

  function newProjectRoute (path) {
    return {
      path,
      name: 'NewProject',
      component: GHome,
      meta: {
        namespaced: false,
        projectScope: false,
        breadcrumbs: newProjectBreadcrumbs,
      },
      beforeEnter (to, from, next) {
        const defaultNamespace = projectStore.defaultNamespace
        if (!projectStore.namespace && defaultNamespace) {
          projectStore.namespace = defaultNamespace
        }
        next()
      },
    }
  }

  function projectsRoute (path) {
    return {
      path,
      beforeEnter (to, from, next) {
        const namespace = projectStore.namespace || projectStore.defaultNamespace
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

  function accountRoute (path) {
    return {
      path,
      name: 'Account',
      component: GAccount,
      meta: {
        namespaced: false,
        projectScope: false,
        breadcrumbs: accountBreadcrumbs,
      },
      beforeEnter (to, from, next) {
        const namespace = projectStore.namespace || projectStore.defaultNamespace
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

  function settingsRoute (path) {
    return {
      path,
      name: 'Settings',
      component: GSettings,
      meta: {
        namespaced: false,
        projectScope: false,
        breadcrumbs: settingsBreadcrumbs,
      },
      beforeEnter (to, from, next) {
        const namespace = projectStore.namespace || projectStore.defaultNamespace
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

  function shootListRoute (path) {
    return {
      path,
      name: 'ShootList',
      component: GShootList,
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

  function newShootRoute (path) {
    return {
      path,
      name: 'NewShoot',
      component: GNewShoot,
      meta: {
        breadcrumbs: newShootBreadcrumbs,
        tabs: newShootTabs,
      },
    }
  }

  function newShootEditorRoute (path) {
    return {
      path,
      name: 'NewShootEditor',
      component: GNewShootEditor,
      meta: {
        breadcrumbs: newShootEditorBreadcrumbs,
        tabs: newShootTabs,
      },
    }
  }

  function shootItemRoute (path) {
    return {
      path,
      name: 'ShootItem',
      component: GShootItem,
      meta: {
        breadcrumbs: shootItemBreadcrumbs,
        tabs: shootItemTabs,
      },
    }
  }

  function shootItemEditorRoute (path) {
    return {
      path,
      name: 'ShootItemEditor',
      component: GShootItemEditor,
      meta: {
        breadcrumbs: shootItemBreadcrumbs,
        tabs: shootItemTabs,
      },
    }
  }

  function shootItemHibernationRoute (path) {
    return {
      path,
      name: 'ShootItemHibernationSettings',
      component: GShootItem,
      meta: {
        breadcrumbs: shootItemBreadcrumbs,
        tabs: shootItemTabs,
      },
    }
  }

  function shootItemTerminalRoute (path) {
    return {
      path,
      name: 'ShootItemTerminal',
      component: GShootItemTerminal,
      meta: {
        breadcrumbs: shootItemTerminalBreadcrumbs,
      },
      beforeEnter (to, from, next) {
        if (authzStore.hasShootTerminalAccess) {
          next()
        } else {
          next('/')
        }
      },
    }
  }

  function secretListRoute (path) {
    return {
      path,
      name: 'Secrets',
      component: GSecrets,
      meta: {
        menu: {
          title: 'Secrets',
          icon: 'mdi-key',
          get hidden () {
            return !authzStore.canGetSecrets
          },
        },
        breadcrumbs: secretsBreadcrumbs,
      },
    }
  }

  function secretItemRoute (path) {
    return {
      path,
      name: 'Secret',
      component: GSecrets,
      meta: {
        breadcrumbs: secretItemBreadcrumbs,
      },
    }
  }

  function membersRoute (path) {
    return {
      path,
      name: 'Members',
      component: GMembers,
      meta: {
        menu: {
          title: 'Members',
          icon: 'mdi-account-multiple-outline',
        },
        breadcrumbs: membersBreadcrumbs,
      },
    }
  }

  function administrationRoute (path) {
    return {
      path,
      name: 'Administration',
      component: GAdministration,
      meta: {
        menu: {
          title: 'Administration',
          icon: 'mdi-cog',
        },
        breadcrumbs: administrationBreadcrumbs,
      },
    }
  }

  function gardenTerminalRoute (path) {
    return {
      path,
      name: 'GardenTerminal',
      component: GShootItemTerminal,
      meta: {
        menu: {
          title: 'Garden Cluster',
          icon: 'mdi-console',
          get hidden () {
            return !(authzStore.hasGardenTerminalAccess && authnStore.isAdmin)
          },
        },
        breadcrumbs: terminalBreadcrumbs,
      },
      beforeEnter (to, from, next) {
        if (authzStore.hasGardenTerminalAccess) {
          to.params.target = 'garden'
          next()
        } else {
          next('/')
        }
      },
    }
  }
}
