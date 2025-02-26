//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { useAppStore } from '@/store/app'
import { useAuthnStore } from '@/store/authn'
import { useAuthzStore } from '@/store/authz'
import { useProjectStore } from '@/store/project'

/* Layouts */
import GLogin from '@/layouts/GLogin.vue'
import GDefault from '@/layouts/GDefault.vue'

/* Views */
import GError from '@/views/GError.vue'
import GNotFound from '@/views/GNotFound.vue'
import GProjectPlaceholder from '@/views/GProjectPlaceholder.vue'
import GNewShootPlaceholder from '@/views/GNewShootPlaceholder.vue'
import GNewShootEditor from '@/views/GNewShootEditor.vue'
import GShootItemPlaceholder from '@/views/GShootItemPlaceholder.vue'
import GShootItemEditor from '@/views/GShootItemEditor.vue'
import GAccount from '@/views/GAccount.vue'
import GSettings from '@/views/GSettings.vue'

import {
  homeBreadcrumbs,
  newProjectBreadcrumbs,
  accountBreadcrumbs,
  settingsBreadcrumbs,
  shootListBreadcrumbs,
  shootItemBreadcrumbs,
  shootItemTerminalBreadcrumbs,
  credentialsBreadcrumbs,
  newShootBreadcrumbs,
  newShootEditorBreadcrumbs,
  administrationBreadcrumbs,
  membersBreadcrumbs,
  terminalBreadcrumbs,
  notFoundBreadcrumbs,
} from './breadcrumbs'
import {
  newShootTabs,
  shootItemTabs,
} from './tabs'

const GMembers = () => import('@/views/GMembers.vue')
const GHome = () => import('@/views/GHome.vue')
const GCredentials = () => import('@/views/GCredentials.vue')
const GAdministration = () => import('@/views/GAdministration.vue')

const GNewShoot = () => import('@/views/GNewShoot.vue')
const GShootList = () => import('@/views/GShootList.vue')
const GShootItem = () => import('@/views/GShootItem.vue')
const GShootItemTerminal = () => import('@/views/GShootItemTerminal.vue')

export function createRoutes () {
  const appStore = useAppStore()
  const authnStore = useAuthnStore()
  const authzStore = useAuthzStore()
  const projectStore = useProjectStore()

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
        shootListRoute('shoots'),
        newShootHierarchy('shoots/+'),
        shootItemHierarchy('shoots/:name'),
        credentialListRoute('credentials'),
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

  /* New Shoot Hierachy "/namespace/:namespace/shoots/+" */
  function newShootHierarchy (path) {
    return {
      path,
      component: GNewShootPlaceholder,
      children: [
        newShootRoute(''),
        newShootEditorRoute('yaml'),
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
      beforeEnter: redirectToShootList,
    }
  }

  function newProjectRoute (path) {
    return {
      path,
      name: 'NewProject',
      component: GHome,
      meta: {
        title: 'New Project',
        namespaced: false,
        projectScope: false,
        breadcrumbs: newProjectBreadcrumbs,
      },
    }
  }

  function projectsRoute (path) {
    return {
      path,
      name: 'ProjectList',
      beforeEnter: redirectToShootList,
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
      beforeEnter: addNamespaceToUrl,
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
      beforeEnter: addNamespaceToUrl,
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
        title: 'Clusters',
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
        title: 'New Cluster',
        breadcrumbs: newShootBreadcrumbs,
        tabKey: 'newShootOverview',
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
        title: 'New Cluster Editor',
        breadcrumbs: newShootEditorBreadcrumbs,
        tabKey: 'newShootYaml',
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
        title: 'Cluster Details',
        breadcrumbs: shootItemBreadcrumbs,
        tabKey: 'shootOverview',
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
        title: 'Cluster Editor',
        breadcrumbs: shootItemBreadcrumbs,
        tabKey: 'shootYaml',
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
        title: 'Cluster Details',
        breadcrumbs: shootItemBreadcrumbs,
        tabKey: 'shootOverview',
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
        title: 'Cluster Terminal',
        breadcrumbs: shootItemTerminalBreadcrumbs,
      },
      beforeEnter (to, from) {
        if (!authzStore.hasShootTerminalAccess) {
          appStore.setError({
            text: 'Access to cluster terminal is not allowed',
          })
          return from
        }
      },
    }
  }

  function credentialListRoute (path) {
    return {
      path,
      name: 'Credentials',
      component: GCredentials,
      meta: {
        menu: {
          title: 'Credentials',
          icon: 'mdi-key',
          get hidden () {
            return !authzStore.canGetCloudProviderCredentials
          },
        },
        breadcrumbs: credentialsBreadcrumbs,
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
        title: 'Garden Cluster Terminal',
        breadcrumbs: terminalBreadcrumbs,
      },
      beforeEnter (to, from) {
        if (!authzStore.hasGardenTerminalAccess) {
          appStore.setError({
            text: 'Access to garden terminal is not allowed.',
          })
          return from
        }
        to.params.target = 'garden'
      },
    }
  }

  /* Helper functions */
  function redirectToShootList (to) {
    const namespace = authzStore.namespace || projectStore.defaultNamespace
    if (namespace) {
      return {
        name: 'ShootList',
        params: { namespace },
      }
    }
  }

  function addNamespaceToUrl (to) {
    const namespace = authzStore.namespace || projectStore.defaultNamespace
    if (!to.query.namespace && namespace) {
      return {
        name: to.name,
        query: {
          namespace,
          ...to.query,
        },
      }
    }
  }
}
