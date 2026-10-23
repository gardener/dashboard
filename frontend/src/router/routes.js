//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { useAppStore } from '@/store/app'
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
import GSeedItemPlaceholder from '@/views/GSeedItemPlaceholder.vue'
import GShootItemEditor from '@/views/GShootItemEditor.vue'
import GAccount from '@/views/GAccount.vue'
import GSettings from '@/views/GSettings.vue'

import {
  projectListBreadcrumbs,
  newProjectBreadcrumbs,
  accountBreadcrumbs,
  settingsBreadcrumbs,
  shootListBreadcrumbs,
  seedListBreadcrumbs,
  seedItemBreadcrumbs,
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
  seedItemTabs,
  shootItemTabs,
} from './tabs'

const GMembers = () => import('@/views/GMembers.vue')
const GProjectList = () => import('@/views/GProjectList.vue')
const GCredentials = () => import('@/views/GCredentials.vue')
const GAdministration = () => import('@/views/GAdministration.vue')

const GNewShoot = () => import('@/views/GNewShoot.vue')
const GShootList = () => import('@/views/GShootList.vue')
const GSeedList = () => import('@/views/GSeedList.vue')
const GSeedItem = () => import('@/views/GSeedItem.vue')
const GSeedItemEditor = () => import('@/views/GSeedItemEditor.vue')
const GShootItem = () => import('@/views/GShootItem.vue')
const GShootItemTerminal = () => import('@/views/GShootItemTerminal.vue')

const shootNamespaceRouteNames = new Map([
  ['yaml', 'ShootItemEditor'],
  ['hibernation', 'ShootItemHibernationSettings'],
  ['term', 'ShootItemTerminal'],
])
const namespaceRouteNames = new Map([
  ['credentials', 'Credentials'],
  ['members', 'Members'],
  ['administration', 'Administration'],
  ['term', 'GardenTerminal'],
])

export function createRoutes () {
  const appStore = useAppStore()
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
      seedListRoute('seeds'),
      seedItemHierarchy('seeds/:name'),
      shootListRoute('clusters', 'AllClusters'),
      projectsRoute('projects'),
      newProjectRoute('projects/+'),
      projectHierarchy('projects/:projectName'),
      namespaceRoute('namespace/:pathMatch(.*)*'),
      {
        path: ':pathMatch(.*)*',
        component: GNotFound,
        meta: {
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

  /* Project Hierachy "/projects/:projectName" */
  function projectHierarchy (path) {
    return {
      path,
      component: GProjectPlaceholder,
      meta: {
        projectScoped: true,
      },
      children: [
        administrationRoute(''),
        shootListRoute('clusters', 'ShootList'),
        newShootHierarchy('clusters/+'),
        shootItemHierarchy('clusters/:name'),
        credentialListRoute('credentials'),
        membersRoute('members'),
        gardenTerminalRoute('garden-cluster'),
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

  /* New Shoot Hierachy "/projects/:projectName/clusters/+" */
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

  /* Seed Item Hierachy "/seeds/:name" */
  function seedItemHierarchy (path) {
    return {
      path,
      component: GSeedItemPlaceholder,
      children: [
        seedItemRoute(''),
        seedItemEditorRoute('yaml'),
        {
          path: ':pathMatch(.*)*',
          component: GNotFound,
          meta: {
            breadcrumbs: seedItemBreadcrumbs,
          },
        },
      ],
    }
  }

  /* Shoot Item Hierachy "/projects/:projectName/clusters/:name" */
  function shootItemHierarchy (path) {
    return {
      path,
      component: GShootItemPlaceholder,
      children: [
        shootItemRoute(''),
        shootItemEditorRoute('yaml'),
        shootItemHibernationRoute('hibernation'),
        shootItemTerminalRoute('terminal'),
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
     * @prop {boolean} [projectScoped]            - Determines whether route belongs to a Project and has projectName in path
     * @prop {string}  [toRouteName]              - It is possible to set a default child route for a top level item (like the PlaceholderComponent)
     * @prop {string}  [title]                    - Document title
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
      beforeEnter: redirectToShootList,
    }
  }

  function newProjectRoute (path) {
    return {
      path,
      name: 'NewProject',
      component: GProjectList,
      meta: {
        title: 'New Project',
        breadcrumbs: newProjectBreadcrumbs,
      },
      beforeEnter () {
        if (!authzStore.canCreateProjectForNamespace(null)) {
          return { name: 'ProjectList', replace: true }
        }
      },
    }
  }

  function projectsRoute (path) {
    return {
      path,
      name: 'ProjectList',
      component: GProjectList,
      meta: {
        title: 'Projects',
        breadcrumbs: projectListBreadcrumbs,
      },
    }
  }

  function namespaceRoute (path) {
    return {
      path,
      name: 'Namespace',
      beforeEnter: namespaceTarget,
    }
  }

  function accountRoute (path) {
    return {
      path,
      name: 'Account',
      component: GAccount,
      meta: {
        breadcrumbs: accountBreadcrumbs,
      },
    }
  }

  function settingsRoute (path) {
    return {
      path,
      name: 'Settings',
      component: GSettings,
      meta: {
        breadcrumbs: settingsBreadcrumbs,
      },
    }
  }

  function shootListRoute (path, name) {
    return {
      path,
      name,
      component: GShootList,
      meta: {
        title: 'Clusters',
        breadcrumbs: shootListBreadcrumbs,
      },
    }
  }

  function seedListRoute (path) {
    return {
      path,
      name: 'SeedList',
      component: GSeedList,
      meta: {
        title: 'Seeds',
        breadcrumbs: seedListBreadcrumbs,
      },
      beforeEnter (to, from) {
        const fallbackRedirect = getFallbackRedirectIfNoSeedAccess(to, from)
        if (fallbackRedirect) {
          return fallbackRedirect
        }
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

  function seedItemRoute (path) {
    return {
      path,
      name: 'SeedItem',
      component: GSeedItem,
      meta: {
        title: 'Seed Details',
        breadcrumbs: seedItemBreadcrumbs,
        tabKey: 'seedOverview',
        tabs: seedItemTabs,
      },
      beforeEnter (to, from) {
        const fallbackRedirect = getFallbackRedirectIfNoSeedAccess(to, from)
        if (fallbackRedirect) {
          return fallbackRedirect
        }
      },
    }
  }

  function seedItemEditorRoute (path) {
    return {
      path,
      name: 'SeedItemEditor',
      component: GSeedItemEditor,
      meta: {
        title: 'Seed YAML',
        breadcrumbs: seedItemBreadcrumbs,
        tabKey: 'seedYaml',
        tabs: seedItemTabs,
      },
      beforeEnter (to, from) {
        const fallbackRedirect = getFallbackRedirectIfNoSeedAccess(to, from)
        if (fallbackRedirect) {
          return fallbackRedirect
        }
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
        if (!authzStore.hasShootTerminalAccessForNamespace(to.meta.namespace)) {
          appStore.setError({
            text: 'Access to cluster terminal is not allowed',
          })
          return false
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
        title: 'Garden Cluster Terminal',
        breadcrumbs: terminalBreadcrumbs,
      },
      beforeEnter (to, from) {
        if (!authzStore.hasGardenTerminalAccessForNamespace(to.meta.namespace)) {
          appStore.setError({
            text: 'Access to garden terminal is not allowed.',
          })
          return false
        }
        to.params.target = 'garden'
      },
    }
  }

  /* Helper functions */
  function namespaceTarget (to) {
    const path = to.path.replace(/^\/namespace\/?/, '')
    if (!path) {
      return redirectToShootList()
    }
    if (path === '+') {
      return { name: 'NewProject', replace: true }
    }

    const [namespace, resource, name, subresource] = path.split('/')
    if (namespace === '_all') {
      return {
        name: 'AllClusters',
        query: !resource || (resource === 'shoots' && !name)
          ? shootListQuery(to.query)
          : undefined,
        replace: true,
      }
    }

    const project = projectStore.projectByNamespace(namespace)
    if (!project) {
      const message = `The namespace ${namespace} is not associated with an accessible Project`
      throw Object.assign(new Error(message), {
        status: 403,
        reason: 'Forbidden',
      })
    }

    const target = {
      name: 'ShootList',
      params: { projectName: project.metadata.name },
      replace: true,
    }
    if (resource === 'shoots') {
      target.query = shootListQuery(to.query)
      if (name === '+') {
        target.name = subresource === 'yaml' ? 'NewShootEditor' : 'NewShoot'
      } else if (name) {
        target.name = shootNamespaceRouteNames.get(subresource) ?? 'ShootItem'
        target.params.name = name
      }
    } else if (resource) {
      target.name = namespaceRouteNames.get(resource) ?? 'ShootList'
    } else {
      target.query = shootListQuery(to.query)
    }
    return target
  }

  function shootListQuery (query) {
    return Object.hasOwn(query, 'q') ? { q: query.q } : undefined
  }

  function getFallbackRedirectIfNoSeedAccess (to, from) {
    if (authzStore.canViewLandscapeForNamespace(null)) {
      return
    }

    if (from?.name && from.name !== to.name) {
      return false
    }

    return {
      name: 'Home',
    }
  }

  function redirectToShootList (to) {
    const project = projectStore.lastProject ??
      projectStore.projectByNamespace(authzStore.namespace) ??
      projectStore.projectByNamespace(projectStore.defaultNamespace)
    if (project) {
      return {
        name: 'ShootList',
        params: { projectName: project.metadata.name },
        replace: true,
      }
    }
    return { name: 'ProjectList', replace: true }
  }
}
