//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { shallowMount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import { useConfigStore } from '@/store/config'
import { useProjectStore } from '@/store/project'

import GMainProjectSelection from '@/components/GMainProjectSelection.vue'

const { createVuetifyPlugin } = global.fixtures.helper

describe('components', () => {
  describe('g-main-project-selection', () => {
    it('emits a selection request without changing the selected project', () => {
      const pinia = createPinia()
      const sourceProject = {
        metadata: {
          name: 'source',
          uid: 'source-uid',
        },
        spec: {
          namespace: 'garden-source',
        },
        status: {
          phase: 'Ready',
        },
      }
      const targetProject = {
        metadata: {
          name: 'target',
          uid: 'target-uid',
        },
        spec: {
          namespace: 'garden-target',
        },
        status: {
          phase: 'Ready',
        },
      }

      const wrapper = shallowMount(GMainProjectSelection, {
        props: {
          selectedProject: sourceProject,
        },
        global: {
          plugins: [
            createVuetifyPlugin(),
            pinia,
          ],
        },
      })

      wrapper.vm.selectProject(sourceProject)
      expect(wrapper.emitted('projectSelect')).toBeUndefined()

      wrapper.vm.projectMenu = true
      wrapper.vm.selectProject(targetProject)

      expect(wrapper.emitted('projectSelect')).toEqual([[targetProject]])
      expect(wrapper.vm.selectedProjectName).toBe('source')
      expect(wrapper.vm.projectMenu).toBe(false)
    })

    it('does not select a Pending Project', () => {
      const pinia = createPinia()
      const pendingProject = {
        metadata: { name: 'pending', uid: 'pending-uid' },
        spec: { namespace: 'garden-pending' },
        status: { phase: 'Pending' },
      }
      const projectStore = useProjectStore(pinia)
      projectStore.list = [pendingProject]
      const wrapper = shallowMount(GMainProjectSelection, {
        global: {
          plugins: [
            createVuetifyPlugin(),
            pinia,
          ],
        },
      })

      wrapper.vm.selectProject(pendingProject)

      expect(wrapper.vm.sortedAndFilteredProjectItems.map(project => project.spec.namespace)).toEqual(['_all'])
      expect(wrapper.emitted('projectSelect')).toBeUndefined()
    })

    it('handles a cleared project filter', () => {
      const wrapper = shallowMount(GMainProjectSelection, {
        global: {
          plugins: [
            createVuetifyPlugin(),
            createPinia(),
          ],
        },
      })

      wrapper.vm.projectFilter = null

      expect(wrapper.vm.sortedAndFilteredProjectItems).toHaveLength(1)
    })

    it('requests route-backed Project actions', () => {
      const wrapper = shallowMount(GMainProjectSelection, {
        global: {
          plugins: [
            createVuetifyPlugin(),
            createPinia(),
          ],
        },
      })

      wrapper.vm.projectMenu = true
      wrapper.vm.navigate('ProjectList')
      wrapper.vm.navigate('NewProject')

      expect(wrapper.emitted('navigate')).toEqual([
        ['ProjectList'],
        ['NewProject'],
      ])
      expect(wrapper.vm.projectMenu).toBe(false)
    })

    it('limits the project list height by the teaser height', () => {
      const pinia = createPinia()
      const configStore = useConfigStore(pinia)
      const wrapper = shallowMount(GMainProjectSelection, {
        global: {
          plugins: [
            createVuetifyPlugin(),
            pinia,
          ],
        },
      })

      expect(wrapper.vm.projectListMaxHeight).toBe('calc(100vh - 480px)')

      configStore.setConfiguration({ branding: { teaserHeight: 300 } })

      expect(wrapper.vm.projectListMaxHeight).toBe('calc(100vh - 580px)')
    })
  })
})
