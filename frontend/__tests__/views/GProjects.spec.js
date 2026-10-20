//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  flushPromises,
  shallowMount,
} from '@vue/test-utils'
import { createPinia } from 'pinia'
import {
  createMemoryHistory,
  createRouter,
  createWebHistory,
} from 'vue-router'

import { useAuthzStore } from '@/store/authz'
import { useLocalStorageStore } from '@/store/localStorage'
import { useProjectStore } from '@/store/project'

import GProjectList from '@/views/GProjectList.vue'

import { useApi } from '@/composables/useApi'

// Each test mounts with a new Pinia, so the shared filter state must not outlive a test.
vi.mock('@vueuse/core', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    createSharedComposable: fn => fn,
  }
})

const { createVuetifyPlugin } = global.fixtures.helper

function createProject (name, {
  title,
  description,
  purpose,
  owner = 'owner@example.org',
  createdBy = 'creator@example.org',
  phase = 'Ready',
  creationTimestamp = '2026-01-01T00:00:00Z',
  staleSinceTimestamp,
} = {}) {
  return {
    metadata: {
      name,
      uid: `${name}-uid`,
      creationTimestamp,
      annotations: title
        ? { 'dashboard.gardener.cloud/project-title': title }
        : undefined,
    },
    spec: {
      namespace: `garden-${name}`,
      owner: { name: owner },
      createdBy: { name: createdBy },
      description,
      purpose,
    },
    status: {
      phase,
      staleSinceTimestamp,
    },
  }
}

async function mountProjects ({
  projects = [],
  canCreate = false,
  history = createMemoryHistory(),
  locations = [{ name: 'ProjectList' }],
} = {}) {
  const pinia = createPinia()
  const projectStore = useProjectStore(pinia)
  const authzStore = useAuthzStore(pinia)
  const localStorageStore = useLocalStorageStore(pinia)
  projectStore.list = projects
  vi.spyOn(useApi(), 'getSubjectRules').mockResolvedValueOnce({
    data: {
      resourceRules: canCreate
        ? [{
            apiGroups: ['core.gardener.cloud'],
            resources: ['projects'],
            verbs: ['create'],
          }]
        : [],
    },
  })
  await authzStore.fetchRules()

  const router = createRouter({
    history,
    routes: [
      { name: 'ProjectList', path: '/projects', component: {} },
      { name: 'NewProject', path: '/projects/+', component: {} },
      { name: 'Administration', path: '/projects/:projectName', component: {} },
      { name: 'ShootList', path: '/projects/:projectName/clusters', component: {} },
    ],
  })
  for (const location of locations) {
    await router.push(location)
  }

  const wrapper = shallowMount(GProjectList, {
    global: {
      plugins: [
        createVuetifyPlugin(),
        pinia,
        router,
      ],
      stubs: {
        GProjectDialog: true,
        GProjectListRow: true,
        GToolbar: { template: '<div><slot name="append" /></div>' },
        VCard: { template: '<div><slot /></div>' },
        VCardText: { template: '<div><slot /></div>' },
        VContainer: { template: '<div><slot /></div>' },
        VDataTableVirtual: { template: '<table><slot name="loading" /><slot name="no-data" /><slot name="bottom" /></table>' },
      },
    },
  })
  await flushPromises()

  return {
    authzStore,
    localStorageStore,
    router,
    wrapper,
  }
}

describe('views GProjectList', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('explains why Project creation is unavailable', async () => {
    const { wrapper } = await mountProjects()

    expect(wrapper.text()).toContain('No Projects available')
    expect(wrapper.text()).toContain('You don\'t have permission to create a Project.')
    const createButtons = wrapper.findAllComponents({ name: 'VBtn' }).filter(button => {
      return button.props('prependIcon') === 'mdi-plus'
    })
    expect(createButtons).toHaveLength(1)
    expect(createButtons[0].props('disabled')).toBe(true)
    expect(createButtons[0].props('to')).toBeUndefined()
  })

  it('shows first-Project creation when authorized', async () => {
    const { authzStore, wrapper } = await mountProjects({ canCreate: true })

    expect(wrapper.text()).toContain('Create your first Project')
    let createButtons = wrapper.findAllComponents({ name: 'VBtn' }).filter(button => {
      return button.props('prependIcon') === 'mdi-plus'
    })
    expect(createButtons).toHaveLength(1)
    expect(createButtons[0].props('disabled')).toBe(false)
    expect(createButtons[0].props('to')).toEqual({ name: 'NewProject', query: { q: '' } })

    authzStore._setNamespace('_all')
    await flushPromises()

    createButtons = wrapper.findAllComponents({ name: 'VBtn' }).filter(button => {
      return button.props('prependIcon') === 'mdi-plus'
    })
    expect(createButtons).toHaveLength(1)
    expect(createButtons[0].props('disabled')).toBe(false)
    expect(createButtons[0].props('to')).toEqual({ name: 'NewProject', query: { q: '' } })
  })

  it('hides Project creation in the toolbar when not authorized', async () => {
    const { wrapper } = await mountProjects({ projects: [createProject('core')] })

    const createButtons = wrapper.findAllComponents({ name: 'VBtn' }).filter(button => {
      return button.props('icon') === 'mdi-plus' || button.props('prependIcon') === 'mdi-plus'
    })
    expect(createButtons).toHaveLength(0)
  })

  it('keeps the search while opening and closing Project creation', async () => {
    window.history.replaceState(null, '', '/')
    const { router, wrapper } = await mountProjects({
      projects: [createProject('core')],
      canCreate: true,
      history: createWebHistory(),
      locations: [
        { name: 'ShootList', params: { projectName: 'core' } },
        { name: 'ProjectList' },
      ],
    })
    wrapper.vm.search = 'owner:alice@example.org'
    await wrapper.vm.$nextTick()

    const createButtons = wrapper.findAllComponents({ name: 'VBtn' }).filter(button => {
      return button.props('to')?.name === 'NewProject'
    })
    expect(createButtons).toHaveLength(1)
    expect(createButtons[0].props('icon')).toBe('mdi-plus')
    expect(wrapper.vm.projectDialog).toBe(false)
    await router.push(createButtons[0].props('to'))

    expect(router.currentRoute.value).toMatchObject({
      name: 'NewProject',
      query: { q: 'owner:alice@example.org' },
    })
    expect(wrapper.vm.projectDialog).toBe(true)
    expect(wrapper.vm.search).toBe('owner:alice@example.org')

    wrapper.findComponent({ name: 'GProjectDialog' }).vm.$emit('update:modelValue', false)
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('ProjectList'))

    expect(router.currentRoute.value.query).toEqual({ q: 'owner:alice@example.org' })
    expect(wrapper.vm.projectDialog).toBe(false)
    expect(wrapper.vm.search).toBe('owner:alice@example.org')

    router.back()
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('ShootList'))
  })

  it('replaces Project creation with the Project list when not opened from it', async () => {
    window.history.replaceState(null, '', '/')
    const { router, wrapper } = await mountProjects({
      projects: [createProject('core')],
      canCreate: true,
      history: createWebHistory(),
      locations: [
        { name: 'ShootList', params: { projectName: 'core' } },
        { name: 'NewProject' },
      ],
    })
    expect(wrapper.vm.projectDialog).toBe(true)

    wrapper.findComponent({ name: 'GProjectDialog' }).vm.$emit('update:modelValue', false)
    await flushPromises()

    expect(router.currentRoute.value).toMatchObject({
      name: 'ProjectList',
      query: { q: '' },
    })
    expect(wrapper.vm.projectDialog).toBe(false)

    router.back()
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('ShootList'))
  })

  it('sorts by title and searches technical name, title, description, and owner', async () => {
    const { wrapper } = await mountProjects({
      projects: [
        createProject('zeta', {
          title: 'Alpha team',
          description: 'Shared platform services',
          owner: 'alice@example.org',
        }),
        createProject('beta', { owner: 'bob@example.org' }),
      ],
    })

    expect(wrapper.vm.filteredProjects.map(project => project.metadata.name)).toEqual(['zeta', 'beta'])

    wrapper.vm.search = 'bob@'
    expect(wrapper.vm.filteredProjects.map(project => project.metadata.name)).toEqual(['beta'])

    wrapper.vm.search = 'alpha'
    expect(wrapper.vm.filteredProjects.map(project => project.metadata.name)).toEqual(['zeta'])

    wrapper.vm.search = 'description:platform'
    expect(wrapper.vm.filteredProjects.map(project => project.metadata.name)).toEqual(['zeta'])

    wrapper.vm.search = 'ZETA'
    expect(wrapper.vm.filteredProjects.map(project => project.metadata.name)).toEqual(['zeta'])
  })
})
