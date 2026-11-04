//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  createMemoryHistory,
  createRouter,
} from 'vue-router'
import {
  createPinia,
  setActivePinia,
} from 'pinia'

import { useAppStore } from '@/store/app'
import { useAuthzStore } from '@/store/authz'
import { useProjectStore } from '@/store/project'

import { createRoutes } from '@/router/routes'

// Navigating the real routes would load every view's component tree without
// rendering it, which only dilutes the coverage report.
vi.mock('@/layouts/GLogin.vue', () => ({ default: {} }))
vi.mock('@/layouts/GDefault.vue', () => ({ default: {} }))
vi.mock('@/views/GError.vue', () => ({ default: {} }))
vi.mock('@/views/GNotFound.vue', () => ({ default: {} }))
vi.mock('@/views/GProjectPlaceholder.vue', () => ({ default: {} }))
vi.mock('@/views/GNewShootPlaceholder.vue', () => ({ default: {} }))
vi.mock('@/views/GNewShootEditor.vue', () => ({ default: {} }))
vi.mock('@/views/GShootItemPlaceholder.vue', () => ({ default: {} }))
vi.mock('@/views/GSeedItemPlaceholder.vue', () => ({ default: {} }))
vi.mock('@/views/GShootItemEditor.vue', () => ({ default: {} }))
vi.mock('@/views/GAccount.vue', () => ({ default: {} }))
vi.mock('@/views/GSettings.vue', () => ({ default: {} }))
vi.mock('@/views/GMembers.vue', () => ({ default: {} }))
vi.mock('@/views/GProjectList.vue', () => ({ default: {} }))
vi.mock('@/views/GCredentials.vue', () => ({ default: {} }))
vi.mock('@/views/GAdministration.vue', () => ({ default: {} }))
vi.mock('@/views/GNewShoot.vue', () => ({ default: {} }))
vi.mock('@/views/GShootList.vue', () => ({ default: {} }))
vi.mock('@/views/GSeedList.vue', () => ({ default: {} }))
vi.mock('@/views/GSeedItem.vue', () => ({ default: {} }))
vi.mock('@/views/GSeedItemEditor.vue', () => ({ default: {} }))
vi.mock('@/views/GShootItem.vue', () => ({ default: {} }))
vi.mock('@/views/GShootItemTerminal.vue', () => ({ default: {} }))

function createTestRouter () {
  setActivePinia(createPinia())
  const authzStore = useAuthzStore()
  vi.spyOn(authzStore, 'canCreateProjectForNamespace').mockReturnValue(true)
  vi.spyOn(authzStore, 'hasGardenTerminalAccessForNamespace').mockReturnValue(true)
  vi.spyOn(authzStore, 'hasShootTerminalAccessForNamespace').mockReturnValue(true)
  const projectStore = useProjectStore()
  projectStore.list = [{
    metadata: { name: 'core', uid: 'core-uid' },
    spec: {
      namespace: 'garden-core',
      owner: { name: 'owner@example.org' },
    },
    status: { phase: 'Ready' },
  }]
  const router = createRouter({
    history: createMemoryHistory(),
    routes: createRoutes(),
  })
  return { projectStore, router }
}

describe('router routes', () => {
  it('uses the Project Cluster list for the root entry point', async () => {
    const { router } = createTestRouter()
    await router.push('/')
    expect(router.currentRoute.value.fullPath).toBe('/namespace/garden-core/shoots')
  })

  it.each([
    ['no Projects are accessible', []],
    ['only Pending Projects are accessible', [{
      metadata: { name: 'pending', uid: 'pending-uid' },
      spec: { namespace: 'garden-pending' },
      status: { phase: 'Pending' },
    }]],
  ])('uses Projects as the root entry point when %s', async (_, list) => {
    const { projectStore, router } = createTestRouter()
    projectStore.list = list

    await router.push('/')

    expect(router.currentRoute.value.fullPath).toBe('/projects')
  })

  it('keeps the Projects overview when a Project is remembered', async () => {
    const { projectStore, router } = createTestRouter()
    projectStore.rememberProject('core')

    await router.push('/projects')

    expect(router.currentRoute.value.name).toBe('ProjectList')
  })

  it.each([
    ['accessible Projects', undefined],
    ['no accessible Projects', []],
  ])('opens Project creation with %s', async (_, list) => {
    const { projectStore, router } = createTestRouter()
    if (list) {
      projectStore.list = list
    }

    await router.push('/projects/+')

    expect(router.currentRoute.value.name).toBe('NewProject')
  })

  it('opens Projects instead of Project creation without permission', async () => {
    const { router } = createTestRouter()
    useAuthzStore().canCreateProjectForNamespace.mockReturnValue(false)

    await router.push('/projects/+')

    expect(router.currentRoute.value.fullPath).toBe('/projects')
  })

  it.each([
    ['/namespace/garden-core/shoots', 'ShootList', { namespace: 'garden-core' }],
    ['/namespace/garden-core/shoots?q=', 'ShootList', { namespace: 'garden-core' }],
    ['/namespace/garden-core/shoots?q=seed:%22az-ha1%22', 'ShootList', { namespace: 'garden-core' }],
    ['/namespace/_all/shoots', 'AllClusters', {}],
    ['/namespace/_all/shoots?q=seed:%22az-ha1%22', 'AllClusters', {}],
    ['/namespace/garden-core/shoots/+', 'NewShoot', { namespace: 'garden-core' }],
    ['/namespace/garden-core/shoots/+/yaml', 'NewShootEditor', { namespace: 'garden-core' }],
    ['/namespace/garden-core/shoots/my-cluster', 'ShootItem', { namespace: 'garden-core', name: 'my-cluster' }],
    ['/namespace/garden-core/shoots/my-cluster/yaml', 'ShootItemEditor', { namespace: 'garden-core', name: 'my-cluster' }],
    ['/namespace/garden-core/shoots/my-cluster/hibernation', 'ShootItemHibernationSettings', { namespace: 'garden-core', name: 'my-cluster' }],
    ['/namespace/garden-core/shoots/my-cluster/term', 'ShootItemTerminal', { namespace: 'garden-core', name: 'my-cluster' }],
    ['/namespace/garden-core/credentials', 'Credentials', { namespace: 'garden-core' }],
    ['/namespace/garden-core/term/garden', 'GardenTerminal', { namespace: 'garden-core' }],
    ['/projects/core', 'Administration', { projectName: 'core' }],
    ['/projects/core/members', 'Members', { projectName: 'core' }],
  ])('keeps %s', async (path, name, params) => {
    const { router } = createTestRouter()
    await router.push(path)
    expect(router.currentRoute.value).toMatchObject({
      fullPath: path,
      name,
      params,
    })
  })

  it.each([
    ['/namespace/garden-core', '/namespace/garden-core/shoots'],
    ['/namespace/garden-core?q=seed:%22az-ha1%22', '/namespace/garden-core/shoots?q=seed:%22az-ha1%22'],
    ['/namespace/garden-core/term', '/namespace/garden-core/term/garden'],
    ['/namespace/garden-core/members', '/projects/core/members'],
    ['/namespace/garden-core/members?q=abc#anchor', '/projects/core/members?q=abc#anchor'],
    ['/namespace/garden-core/administration', '/projects/core'],
    ['/namespace/garden-core/administration?q=abc#anchor', '/projects/core?q=abc#anchor'],
    ['/namespace/_all', '/namespace/_all/shoots'],
    ['/namespace/_all?q=seed:%22az-ha1%22', '/namespace/_all/shoots?q=seed:%22az-ha1%22'],
    ['/namespace/_all/shoots/cluster', '/namespace/_all/shoots'],
  ])('redirects %s', async (path, expectedPath) => {
    const { router } = createTestRouter()
    await router.push(path)
    expect(router.currentRoute.value.fullPath).toBe(expectedPath)
  })

  it('supports namespace root and Project creation entry points', async () => {
    const { projectStore, router } = createTestRouter()
    projectStore.rememberProject('core')

    await router.push('/namespace')
    expect(router.currentRoute.value.fullPath).toBe('/namespace/garden-core/shoots')

    await router.push('/namespace/+')
    expect(router.currentRoute.value.fullPath).toBe('/projects/+')
  })

  it.each([
    ['/projects/new', 'Administration', { projectName: 'new' }],
    ['/namespace/garden-core/shoots/new', 'ShootItem', { namespace: 'garden-core', name: 'new' }],
    ['/namespace/garden-core/shoots/new/yaml', 'ShootItemEditor', { namespace: 'garden-core', name: 'new' }],
  ])('matches %s to the resource named "new"', (path, name, params) => {
    const { router } = createTestRouter()
    expect(router.resolve(path)).toMatchObject({ name, params })
  })

  it.each([
    '/namespace/garden-private/members',
    '/namespace/garden-private/administration',
  ])('retains the forbidden behavior for %s', async path => {
    const { router } = createTestRouter()
    await router.push(path)
    expect(router.currentRoute.value.fullPath).toBe(path)
    expect(useAppStore().routerError).toMatchObject({
      status: 403,
      reason: 'Forbidden',
    })
  })

  it('uses the last valid Project when entering from a global page', async () => {
    const { projectStore, router } = createTestRouter()
    projectStore.list.push({
      metadata: { name: 'team', uid: 'team-uid' },
      spec: { namespace: 'garden-team' },
      status: { phase: 'Ready' },
    })
    projectStore.rememberProject('team')

    await router.push('/projects')
    await router.push('/')

    expect(router.currentRoute.value.fullPath).toBe('/namespace/garden-team/shoots')
  })
})
