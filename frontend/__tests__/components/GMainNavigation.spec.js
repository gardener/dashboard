//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
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
import { useProjectStore } from '@/store/project'

import GMainNavigation from '@/components/GMainNavigation.vue'

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
    'openProjectDialog',
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
      {
        name: 'ShootList',
        path: '/namespace/:namespace/shoots',
        component: {},
        meta: {
          namespaced: true,
          menu: {
            icon: 'mdi-view-dashboard',
            title: 'Clusters',
          },
        },
      },
      {
        name: 'ShootItem',
        path: '/namespace/:namespace/shoots/:name',
        component: {},
      },
    ],
  })
}

describe('components', () => {
  describe('g-main-navigation', () => {
    it('keeps project selection and sidebar targets on the committed namespace', async () => {
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
      const pushSpy = vi.spyOn(router, 'push')
      router.afterEach((to, from, failure) => {
        if (!failure) {
          authzStore._setNamespace(to.params.namespace)
        }
      })
      await router.push({
        name: 'ShootItem',
        params: {
          namespace: sourceProject.spec.namespace,
          name: 'source-shoot',
        },
      })

      const wrapper = shallowMount(GMainNavigation, {
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
      const projectSelection = () => wrapper.findComponent(GMainProjectSelectionStub)
      const sidebarTargets = () => wrapper
        .findAllComponents(VListItemStub)
        .map(item => item.props('to'))

      expect(projectSelection().props('selectedProject')).toBe(sourceProject)
      expect(sidebarTargets()).toContainEqual({
        name: 'ShootList',
        params: {
          namespace: sourceProject.spec.namespace,
        },
      })

      let continueTargetNavigation
      const removeGuard = router.beforeEach(to => {
        if (to.params.namespace === targetProject.spec.namespace) {
          return new Promise(resolve => {
            continueTargetNavigation = resolve
          })
        }
      })
      const previousPushCount = pushSpy.mock.calls.length
      projectSelection().vm.$emit('projectSelect', targetProject)
      await flushPromises()
      const targetNavigation = pushSpy.mock.results[previousPushCount].value

      const sourceNavigation = router.push({
        name: 'ShootList',
        params: {
          namespace: sourceProject.spec.namespace,
        },
      })
      continueTargetNavigation()
      await sourceNavigation
      const failure = await targetNavigation

      expect(isNavigationFailure(failure, NavigationFailureType.cancelled)).toBe(true)
      expect(router.currentRoute.value.params.namespace).toBe(sourceProject.spec.namespace)
      expect(projectSelection().props('selectedProject')).toBe(sourceProject)
      expect(sidebarTargets()).toContainEqual({
        name: 'ShootList',
        params: {
          namespace: sourceProject.spec.namespace,
        },
      })

      removeGuard()
      projectSelection().vm.$emit('projectSelect', targetProject)
      await flushPromises()

      expect(router.currentRoute.value.params.namespace).toBe(targetProject.spec.namespace)
      expect(projectSelection().props('selectedProject')).toBe(targetProject)
      expect(sidebarTargets()).toContainEqual({
        name: 'ShootList',
        params: {
          namespace: targetProject.spec.namespace,
        },
      })

      const updatedTargetProject = {
        ...targetProject,
        spec: {
          ...targetProject.spec,
          description: 'Updated description',
        },
      }
      projectStore.list.splice(1, 1, updatedTargetProject)
      await nextTick()

      expect(projectSelection().props('selectedProject')).toBe(projectStore.list[1])
    })
  })
})
