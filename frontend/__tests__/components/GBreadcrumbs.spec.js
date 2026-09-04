//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { shallowMount } from '@vue/test-utils'

import GBreadcrumbs from '@/components/GBreadcrumbs.vue'

const { projectStore, route } = vi.hoisted(() => ({
  projectStore: {
    projectName: undefined,
  },
  route: {
    meta: {},
    name: 'ShootList',
    params: {
      namespace: '_all',
    },
  },
}))

vi.mock('@/store/project', () => ({
  useProjectStore: () => projectStore,
}))

vi.mock('vue-router', () => ({
  useRoute: () => route,
}))

describe('components', () => {
  describe('g-breadcrumbs', () => {
    it('uses all as the project breadcrumb for the landscape namespace', () => {
      const wrapper = shallowMount(GBreadcrumbs)

      expect(wrapper.vm.breadcrumbItems.map(({ title }) => title)).toEqual([
        'projects',
        'all',
        'clusters',
      ])
    })
  })
})
