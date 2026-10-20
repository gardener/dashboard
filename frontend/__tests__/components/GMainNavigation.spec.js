//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { nextTick } from 'vue'
import {
  flushPromises,
  shallowMount,
} from '@vue/test-utils'
import {
  createMemoryHistory,
  createRouter,
  isNavigationFailure,
  NavigationFailureType,
} from 'vue-router'
import { createPinia } from 'pinia'

import { useAuthzStore } from '@/store/authz'
import { useAuthnStore } from '@/store/authn'
import { useConfigStore } from '@/store/config'
import { useProjectStore } from '@/store/project'

import GMainNavigation from '@/components/GMainNavigation.vue'

import { useApi } from '@/composables/useApi'

const { createVuetifyPlugin } = global.fixtures.helper

const SlotStub = {
  template: '<div><slot /></div>',
}

const GMainProjectSelectionStub = {
  name: 'GMainProjectSelection',
  props: {
    selectedProject: Object,
  },
  emits: [
    'projectSelect',
    'navigate',
  ],
  template: '<div />',
}

const VListItemStub = {
  name: 'VListItem',
  props: {
    to: Object,
  },
  template: '<div />',
}

function createProject (name) {
  return {
    metadata: {
      name,
      uid: `${name}-uid`,
    },
    spec: {
      namespace: `garden-${name}`,
    },
    status: {
      phase: 'Ready',
    },
  }
}

function createTestRouter () {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { name: 'Home', path: '/', component: {} },
      {
        name: 'ShootList',
        path: '/projects/:projectName/clusters',
        component: {},
        meta: { projectScoped: true },
      },
      {
        name: 'ShootItem',
        path: '/projects/:projectName/clusters/:name',
        component: {},
        meta: { projectScoped: true },
      },
      { name: 'Credentials', path: '/projects/:projectName/credentials', component: {}, meta: { projectScoped: true } },
      { name: 'Members', path: '/projects/:projectName/members', component: {}, meta: { projectScoped: true } },
      { name: 'Administration', path: '/projects/:projectName', component: {}, meta: { projectScoped: true } },
      { name: 'GardenTerminal', path: '/projects/:projectName/garden-cluster', component: {}, meta: { projectScoped: true } },
      { name: 'ProjectList', path: '/projects', component: {} },
      { name: 'AllClusters', path: '/clusters', component: {} },
      { name: 'SeedList', path: '/seeds', component: {} },
    ],
  })
}

function mountNavigation (pinia, router) {
  return shallowMount(GMainNavigation, {
    global: {
      plugins: [
        createVuetifyPlugin(),
        pinia,
        router,
      ],
      stubs: {
        GMainProjectSelection: GMainProjectSelectionStub,
        GProjectDialog: true,
        GTeaser: SlotStub,
        VList: SlotStub,
        VListItem: VListItemStub,
        VNavigationDrawer: SlotStub,
      },
    },
  })
}

async function setup () {
  const pinia = createPinia()
  const authzStore = useAuthzStore(pinia)
  const projectStore = useProjectStore(pinia)
  projectStore.list = [
    createProject('source'),
    createProject('target'),
  ]
  const sourceProject = projectStore.list[0]
  const targetProject = projectStore.list[1]

  const router = createTestRouter()
  router.afterEach((to, from, failure) => {
    if (!failure) {
      const project = projectStore.projectByName(to.params.projectName)
      authzStore._setNamespace(project?.spec.namespace)
      projectStore.rememberProject(to.params.projectName)
    }
  })
  await router.push({
    name: 'ShootItem',
    params: {
      projectName: sourceProject.metadata.name,
      name: 'source-shoot',
    },
  })

  const wrapper = mountNavigation(pinia, router)

  return {
    authzStore,
    pinia,
    projectStore,
    router,
    sourceProject,
    targetProject,
    wrapper,
  }
}

function projectSelection (wrapper) {
  return wrapper.findComponent(GMainProjectSelectionStub)
}

function sidebarTargets (wrapper) {
  return wrapper
    .findAllComponents(VListItemStub)
    .map(item => item.props('to'))
}

describe('components', () => {
  describe('g-main-navigation', () => {
    beforeEach(() => {
      window.localStorage.clear()
    })

    it('shows Projects when no Projects are accessible', async () => {
      const pinia = createPinia()
      const router = createTestRouter()
      await router.push({ name: 'ProjectList' })

      const wrapper = mountNavigation(pinia, router)

      expect(projectSelection(wrapper).exists()).toBe(false)
      expect(sidebarTargets(wrapper)).toEqual([
        { name: 'ProjectList' },
      ])
    })

    it('shows the Project selection and Projects when only Pending Projects exist', async () => {
      const pinia = createPinia()
      const projectStore = useProjectStore(pinia)
      const pendingProject = createProject('pending')
      pendingProject.status.phase = 'Pending'
      projectStore.list = [pendingProject]
      const router = createTestRouter()
      await router.push({ name: 'ProjectList' })

      const wrapper = mountNavigation(pinia, router)

      expect(projectStore.lastProject).toBeUndefined()
      expect(projectSelection(wrapper).exists()).toBe(true)
      expect(projectSelection(wrapper).props('selectedProject')).toBeUndefined()
      expect(sidebarTargets(wrapper)).toEqual([
        { name: 'ProjectList' },
      ])
    })

    it('keeps project selection and sidebar targets on the committed namespace after cancelled navigation', async () => {
      const {
        router,
        sourceProject,
        targetProject,
        wrapper,
      } = await setup()
      const pushSpy = vi.spyOn(router, 'push')

      let continueTargetNavigation
      const removeGuard = router.beforeEach(to => {
        if (to.params.projectName === targetProject.metadata.name) {
          return new Promise(resolve => {
            continueTargetNavigation = resolve
          })
        }
      })
      projectSelection(wrapper).vm.$emit('projectSelect', targetProject)
      await flushPromises()
      const targetNavigation = pushSpy.mock.results[0].value

      const sourceNavigation = router.push({
        name: 'ShootList',
        params: {
          projectName: sourceProject.metadata.name,
        },
      })
      continueTargetNavigation()
      await sourceNavigation
      const failure = await targetNavigation
      removeGuard()

      expect(isNavigationFailure(failure, NavigationFailureType.cancelled)).toBe(true)
      expect(router.currentRoute.value.params.projectName).toBe(sourceProject.metadata.name)
      expect(projectSelection(wrapper).props('selectedProject')).toBe(sourceProject)
      expect(sidebarTargets(wrapper)).toContainEqual({
        name: 'ShootList',
        params: {
          projectName: sourceProject.metadata.name,
        },
      })
    })

    it('updates project selection and sidebar targets after successful navigation', async () => {
      const {
        router,
        targetProject,
        wrapper,
      } = await setup()

      projectSelection(wrapper).vm.$emit('projectSelect', targetProject)
      await flushPromises()

      expect(router.currentRoute.value.params.projectName).toBe(targetProject.metadata.name)
      expect(projectSelection(wrapper).props('selectedProject')).toBe(targetProject)
      expect(sidebarTargets(wrapper)).toContainEqual({
        name: 'ShootList',
        params: {
          projectName: targetProject.metadata.name,
        },
      })
    })

    it('keeps the Project page when switching Projects', async () => {
      const {
        router,
        sourceProject,
        targetProject,
        wrapper,
      } = await setup()
      await router.push({
        name: 'Members',
        params: { projectName: sourceProject.metadata.name },
      })

      projectSelection(wrapper).vm.$emit('projectSelect', targetProject)
      await flushPromises()

      expect(router.currentRoute.value).toMatchObject({
        name: 'Members',
        params: { projectName: targetProject.metadata.name },
      })
    })

    it('ignores a superseded Project selection whose rules resolve late', async () => {
      const {
        authzStore,
        projectStore,
        router,
        sourceProject,
        targetProject,
        wrapper,
      } = await setup()
      projectStore.list.push(createProject('latest'))
      const latestProject = projectStore.list[2]
      await router.push({
        name: 'Credentials',
        params: { projectName: sourceProject.metadata.name },
      })

      let resolveTargetRules
      vi.spyOn(authzStore, 'prepareRules').mockImplementation(namespace => {
        if (namespace === targetProject.spec.namespace) {
          return new Promise(resolve => {
            resolveTargetRules = resolve
          })
        }
        return Promise.resolve()
      })
      vi.spyOn(authzStore, 'canGetCloudProviderCredentialsForNamespace').mockReturnValue(true)

      projectSelection(wrapper).vm.$emit('projectSelect', targetProject)
      projectSelection(wrapper).vm.$emit('projectSelect', latestProject)
      await flushPromises()
      resolveTargetRules()
      await flushPromises()

      expect(router.currentRoute.value).toMatchObject({
        name: 'Credentials',
        params: { projectName: latestProject.metadata.name },
      })
    })

    it('propagates a replaced project object to the project selection', async () => {
      const {
        projectStore,
        sourceProject,
        wrapper,
      } = await setup()

      const updatedSourceProject = {
        ...sourceProject,
        spec: {
          ...sourceProject.spec,
          description: 'Updated description',
        },
      }
      projectStore.list.splice(0, 1, updatedSourceProject)
      await nextTick()

      expect(projectSelection(wrapper).props('selectedProject')).toBe(projectStore.list[0])
    })

    it('preserves the effective q value when switching Project Cluster collections', async () => {
      const {
        router,
        sourceProject,
        targetProject,
        wrapper,
      } = await setup()
      await router.push({
        name: 'ShootList',
        params: { projectName: sourceProject.metadata.name },
        query: { q: '' },
      })

      projectSelection(wrapper).vm.$emit('projectSelect', targetProject)
      await flushPromises()

      expect(router.currentRoute.value.name).toBe('ShootList')
      expect(router.currentRoute.value.params.projectName).toBe(targetProject.metadata.name)
      expect(router.currentRoute.value.query).toEqual({ q: '' })
    })

    it('selects All Projects on the All Clusters route', async () => {
      const {
        router,
        wrapper,
      } = await setup()

      await router.push({ name: 'AllClusters' })

      expect(projectSelection(wrapper).props('selectedProject')).toMatchObject({
        spec: { namespace: '_all' },
      })
      expect(sidebarTargets(wrapper)).toEqual([
        { name: 'AllClusters' },
        { name: 'ProjectList' },
      ])
    })

    it('opens Projects from the Project selector', async () => {
      const {
        router,
        wrapper,
      } = await setup()

      projectSelection(wrapper).vm.$emit('navigate', 'ProjectList')
      await flushPromises()

      expect(router.currentRoute.value.name).toBe('ProjectList')
    })

    it('opens All Clusters when All Projects is selected', async () => {
      const {
        router,
        wrapper,
      } = await setup()

      projectSelection(wrapper).vm.$emit('projectSelect', {
        metadata: { name: 'All Projects' },
        spec: { namespace: '_all' },
      })
      await flushPromises()

      expect(router.currentRoute.value.name).toBe('AllClusters')
    })

    it('keeps the remembered Project and its targets on a global route', async () => {
      const {
        router,
        sourceProject,
        wrapper,
      } = await setup()

      await router.push({ name: 'SeedList' })

      expect(projectSelection(wrapper).props('selectedProject')).toBe(sourceProject)
      expect(sidebarTargets(wrapper)).toContainEqual({
        name: 'ShootList',
        params: { projectName: sourceProject.metadata.name },
      })
    })

    it('keeps permission-gated Project entries visible on a global route', async () => {
      const resourceRules = [
        {
          apiGroups: [''],
          resources: ['secrets', 'serviceaccounts'],
          verbs: ['create', 'list', 'patch'],
        },
        {
          apiGroups: ['security.gardener.cloud'],
          resources: ['workloadidentities'],
          verbs: ['list'],
        },
        {
          apiGroups: ['dashboard.gardener.cloud'],
          resources: ['terminals'],
          verbs: ['create'],
        },
      ]
      vi.spyOn(useApi(), 'getSubjectRules').mockImplementation(({ namespace }) => Promise.resolve({
        data: {
          resourceRules: namespace ? resourceRules : [],
        },
      }))

      const {
        authzStore,
        pinia,
        router,
        sourceProject,
        wrapper,
      } = await setup()
      useAuthnStore(pinia).user = { isAdmin: true }
      useConfigStore(pinia).setConfiguration({ features: { terminalEnabled: true } })
      await authzStore.fetchRules(sourceProject.spec.namespace)
      await flushPromises()

      await router.push({ name: 'SeedList' })
      await Promise.all([
        authzStore.prepareRules(),
        authzStore.prepareRules(sourceProject.spec.namespace),
      ])
      authzStore.activateRules(undefined, sourceProject.spec.namespace)
      await flushPromises()

      expect(authzStore.namespace).toBeNull()
      expect(authzStore.hasRulesForNamespace(sourceProject.spec.namespace)).toBe(true)
      expect(sidebarTargets(wrapper)).toEqual(expect.arrayContaining([
        {
          name: 'Credentials',
          params: { projectName: sourceProject.metadata.name },
        },
        {
          name: 'GardenTerminal',
          params: { projectName: sourceProject.metadata.name },
        },
      ]))
    })

    it('restores the remembered Project after navigating to a global route and reloading', async () => {
      const {
        projectStore,
        router,
        sourceProject,
        wrapper,
      } = await setup()

      await router.push({ name: 'SeedList' })
      await nextTick()

      expect(router.currentRoute.value.fullPath).toBe('/seeds')
      wrapper.unmount()

      const pinia = createPinia()
      const reconstructedProjectStore = useProjectStore(pinia)

      expect(reconstructedProjectStore.lastProject).toBeUndefined()

      reconstructedProjectStore.list = [...projectStore.list]
      await nextTick()
      const reconstructedWrapper = mountNavigation(pinia, router)

      expect(projectSelection(reconstructedWrapper).props('selectedProject')).toEqual(sourceProject)
      expect(sidebarTargets(reconstructedWrapper)).toContainEqual({
        name: 'ShootList',
        params: { projectName: sourceProject.metadata.name },
      })
    })
  })
})
