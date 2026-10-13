//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { nextTick } from 'vue'
import {
  createPinia,
  setActivePinia,
} from 'pinia'

import { useProjectStore } from '@/store/project'

import { useApi } from '@/composables/useApi'

const storageKey = 'global/last-project-name'

function createProject (name, namespace, phase = 'Ready') {
  return {
    metadata: {
      name,
      uid: `${name}-uid`,
    },
    spec: { namespace },
    status: { phase },
  }
}

const projects = [
  createProject('team', 'garden-team'),
  createProject('core', 'garden'),
]

describe('stores', () => {
  describe('project', () => {
    let api

    beforeEach(() => {
      window.localStorage.clear()
      setActivePinia(createPinia())
      api = useApi()
      vi.spyOn(api, 'getProjects')
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    async function loadProjects (projectStore, projectList = projects) {
      api.getProjects.mockResolvedValueOnce({ data: projectList })
      await projectStore.fetchProjects()
      await nextTick()
    }

    it('restores the persisted canonical Project name after store reconstruction', async () => {
      const projectStore = useProjectStore()
      await loadProjects(projectStore)
      projectStore.rememberProject('team')
      await nextTick()

      expect(window.localStorage.getItem(storageKey)).toBe('team')

      setActivePinia(createPinia())
      const reconstructedProjectStore = useProjectStore()

      expect(reconstructedProjectStore.lastProject).toBeUndefined()

      await loadProjects(reconstructedProjectStore)

      expect(reconstructedProjectStore.lastProject).toEqual(projects[0])
      expect(window.localStorage.getItem(storageKey)).toBe('team')
    })

    it.each([
      ['a no-longer-accessible Project', 'removed'],
      ['a namespace instead of a canonical Project name', 'garden-team'],
    ])('replaces %s with the existing default Project fallback', async (description, storedName) => {
      window.localStorage.setItem(storageKey, storedName)
      const projectStore = useProjectStore()

      await loadProjects(projectStore)

      expect(projectStore.lastProject).toEqual(projects[1])
      expect(window.localStorage.getItem(storageKey)).toBe('core')
    })

    it('clears a persisted Project when no Projects are accessible', async () => {
      window.localStorage.setItem(storageKey, 'team')
      const projectStore = useProjectStore()

      await loadProjects(projectStore, [])

      expect(projectStore.lastProject).toBeUndefined()
      expect(window.localStorage.getItem(storageKey)).toBeNull()
    })

    it('clears visible and persisted Project state on reset', async () => {
      const projectStore = useProjectStore()
      await loadProjects(projectStore)
      projectStore.rememberProject('team')
      await nextTick()

      await projectStore.$reset()
      await nextTick()

      expect(projectStore.list).toBeNull()
      expect(projectStore.lastProject).toBeUndefined()
      expect(window.localStorage.getItem(storageKey)).toBeNull()
    })

    it('keeps Pending Projects visible but excludes them from navigation defaults', async () => {
      const pendingProject = createProject('pending', 'garden-pending', 'Pending')
      const projectStore = useProjectStore()

      await loadProjects(projectStore, [pendingProject, projects[0]])

      expect(projectStore.projectNames).toEqual(['pending', 'team'])
      expect(projectStore.defaultNamespace).toBe('garden-team')
      expect(projectStore.lastProject).toEqual(projects[0])

      projectStore.list[0].status.phase = 'Ready'
      projectStore.rememberProject('pending')
      await nextTick()

      expect(projectStore.lastProject).toEqual(pendingProject)
    })

    it('restores the default Project fallback when a Project becomes Ready', async () => {
      const projectStore = useProjectStore()
      await loadProjects(projectStore, [createProject('pending', 'garden', 'Pending')])

      expect(window.localStorage.getItem(storageKey)).toBeNull()

      projectStore.list[0].status.phase = 'Ready'
      await nextTick()

      expect(window.localStorage.getItem(storageKey)).toBe('pending')
    })
  })
})
