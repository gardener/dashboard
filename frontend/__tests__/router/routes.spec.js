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
  it('uses the canonical Project route for the root entry point', async () => {
    const { router } = createTestRouter()
    await router.push('/')
    expect(router.currentRoute.value.fullPath).toBe('/projects/core/clusters')
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
    ['/namespace/garden-core', '/projects/core/clusters'],
    ['/namespace/garden-core?q=seed:%22az-ha1%22', '/projects/core/clusters?q=seed:%22az-ha1%22'],
    ['/namespace/garden-core/shoots', '/projects/core/clusters'],
    ['/namespace/garden-core/shoots?q=', '/projects/core/clusters?q='],
    ['/namespace/garden-core/shoots/+', '/projects/core/clusters/+'],
    ['/namespace/garden-core/shoots/+/yaml', '/projects/core/clusters/+/yaml'],
    ['/namespace/garden-core/shoots/my-cluster', '/projects/core/clusters/my-cluster'],
    ['/namespace/garden-core/shoots/my-cluster/yaml', '/projects/core/clusters/my-cluster/yaml'],
    ['/namespace/garden-core/shoots/my-cluster/hibernation', '/projects/core/clusters/my-cluster/hibernation'],
    ['/namespace/garden-core/shoots/my-cluster/term', '/projects/core/clusters/my-cluster/terminal'],
    ['/namespace/garden-core/credentials', '/projects/core/credentials'],
    ['/namespace/garden-core/members', '/projects/core/members'],
    ['/namespace/garden-core/administration', '/projects/core'],
    ['/namespace/garden-core/term', '/projects/core/garden-cluster'],
    ['/namespace/garden-core/term/garden', '/projects/core/garden-cluster'],
    ['/namespace/_all', '/clusters'],
    ['/namespace/_all/shoots?q=seed:%22az-ha1%22', '/clusters?q=seed:%22az-ha1%22'],
    ['/namespace/_all/shoots/?q=seed:%22az-ha1%22', '/clusters?q=seed:%22az-ha1%22'],
    ['/namespace/_all/shoots/cluster', '/clusters'],
  ])('supports %s', async (path, expectedPath) => {
    const { router } = createTestRouter()
    await router.push(path)
    expect(router.currentRoute.value.fullPath).toBe(expectedPath)
  })

  it('supports namespace root and Project creation entry points', async () => {
    const { projectStore, router } = createTestRouter()
    projectStore.rememberProject('core')

    await router.push('/namespace')
    expect(router.currentRoute.value.fullPath).toBe('/projects/core/clusters')

    await router.push('/namespace/+')
    expect(router.currentRoute.value.fullPath).toBe('/projects/+')
  })

  it.each([
    ['/projects/new', 'Administration', { projectName: 'new' }],
    ['/projects/core/clusters/new', 'ShootItem', { projectName: 'core', name: 'new' }],
    ['/projects/core/clusters/new/yaml', 'ShootItemEditor', { projectName: 'core', name: 'new' }],
  ])('matches %s to the resource named "new"', (path, name, params) => {
    const { router } = createTestRouter()
    expect(router.resolve(path)).toMatchObject({ name, params })
  })

  it('retains the forbidden behavior for inaccessible namespaces', async () => {
    const { router } = createTestRouter()
    await expect(router.push('/namespace/garden-private/shoots')).rejects.toMatchObject({
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

    expect(router.currentRoute.value.fullPath).toBe('/projects/team/clusters')
  })
})
