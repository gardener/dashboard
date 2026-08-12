//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { shallowMount } from '@vue/test-utils'
import { createPinia } from 'pinia'

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
  })
})
