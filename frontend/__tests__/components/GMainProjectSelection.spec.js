//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import { useAuthzStore } from '@/store/authz'
import { useProjectStore } from '@/store/project'

import GMainProjectSelection from '@/components/GMainProjectSelection.vue'

const { createVuetifyPlugin } = global.fixtures.helper

describe('components', () => {
  describe('g-main-project-selection', () => {
    it('should update the selected project when its store entry is replaced', async () => {
      const pinia = createPinia()
      const projectStore = useProjectStore(pinia)
      const authzStore = useAuthzStore(pinia)

      const project = {
        metadata: {
          name: 'foo',
          uid: 'foo-uid',
        },
        spec: {
          namespace: 'garden-foo',
          description: 'Old description',
        },
        status: {
          phase: 'Ready',
        },
      }
      projectStore.list = [project]
      authzStore._setNamespace(project.spec.namespace)

      const wrapper = shallowMount(GMainProjectSelection, {
        props: {
          modelValue: project,
        },
        global: {
          plugins: [
            createVuetifyPlugin(),
            pinia,
          ],
        },
      })

      const updatedProject = {
        ...project,
        spec: {
          ...project.spec,
          description: 'New description',
        },
      }
      projectStore.list.splice(0, 1, updatedProject)
      await nextTick()

      const updates = wrapper.emitted('update:modelValue')
      expect(updates.at(-1)).toEqual([projectStore.list[0]])
    })
  })
})
