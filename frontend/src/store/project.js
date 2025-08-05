//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineStore,
  acceptHMRUpdate,
} from 'pinia'
import {
  ref,
  computed,
  toRef,
} from 'vue'

import { useApi } from '@/composables/useApi'
import { useLogger } from '@/composables/useLogger'
import { useSocketEventHandler } from '@/composables/useSocketEventHandler'

import { annotations } from '@/utils/annotations.js'

import { useAuthzStore } from './authz'
import { useAppStore } from './app'

import filter from 'lodash/filter'
import find from 'lodash/find'
import findIndex from 'lodash/findIndex'
import map from 'lodash/map'
import get from 'lodash/get'
import set from 'lodash/set'
import replace from 'lodash/replace'

export const useProjectStore = defineStore('project', () => {
  const api = useApi()
  const logger = useLogger()
  const appStore = useAppStore()
  const authzStore = useAuthzStore()

  const list = ref(null)

  const isInitial = computed(() => {
    return list.value === null
  })

  const namespace = toRef(authzStore, 'namespace')

  const namespaces = computed(() => {
    return map(list.value, 'spec.namespace')
  })

  const projectNameMap = computed(() => {
    const projectNames = {}
    if (Array.isArray(list.value)) {
      for (const project of list.value) {
        const { metadata: { name }, spec: { namespace } } = project
        set(projectNames, [namespace], name)
      }
    }
    return projectNames
  })

  const projectMap = computed(() => {
    const projects = {}
    if (Array.isArray(list.value)) {
      for (const project of list.value) {
        const { spec: { namespace } } = project
        set(projects, [namespace], project)
      }
    }
    return projects
  })

  const defaultNamespace = computed(() => {
    if (namespaces.value) {
      return namespaces.value.includes('garden')
        ? 'garden'
        : namespaces.value[0]
    }
    return ''
  })

  const currentNamespaces = computed(() => {
    if (namespace.value === '_all') {
      return namespaces.value
    }
    if (namespace.value) {
      return [namespace.value]
    }
    return []
  })

  const projectList = computed(() => {
    return list.value ?? []
  })

  const projectsNotMarkedForDeletion = computed(() => {
    return filter(projectList.value, project => !get(project, ['metadata', 'deletionTimestamp']))
  })

  const project = computed(() => {
    return find(list.value, ['spec.namespace', namespace.value])
  })

  const projectName = computed(() => {
    return get(project.value, ['metadata', 'name'])
  })

  const projectTitle = computed(() => {
    const title = get(project.value, ['metadata', 'annotations', annotations.projectTitle])
    return title ? title.trim() : title
  })

  const projectNameAndTitle = computed(() => {
    const name = projectName.value
    const title = projectTitle.value
    return title ? `${name} – ${title}` : name
  })

  const projectNames = computed(() => {
    return map(list.value, 'metadata.name')
  })

  function updateList (obj) {
    const index = findIndex(list.value, ['metadata.name', obj.metadata.name])
    if (index !== -1) {
      const item = list.value[index] // eslint-disable-line security/detect-object-injection
      list.value.splice(index, 1, Object.assign(item, obj))
    } else {
      list.value.push(obj)
    }
  }

  function isCurrentNamespace (namespace) {
    return currentNamespaces.value.includes(namespace)
  }

  function projectNameByNamespace (metadata) {
    const namespace = typeof metadata === 'string'
      ? metadata
      : metadata?.namespace
    return get(projectNameMap.value, [namespace], replace(namespace, /^garden-/, ''))
  }

  function projectTitleByNamespace (metadata) {
    const namespace = typeof metadata === 'string'
      ? metadata
      : metadata?.namespace
    return get(projectMap.value, [namespace, 'metadata', 'annotations', annotations.projectTitle])
  }

  async function fetchProjects () {
    const response = await api.getProjects()
    list.value = response.data
  }

  async function createProject (project) {
    const response = await api.createProject({ data: project })
    appStore.setSuccess('Project created')
    updateList(response.data)

    return response.data
  }

  async function patchProject (project) {
    const response = await api.patchProject({
      name: get(project, ['metadata', 'name'], projectName.value),
      data: project,
    })
    updateList(response.data)
  }

  async function updateProject (project) {
    const response = await api.updateProject({
      name: get(project, ['metadata', 'name'], projectName.value),
      data: project,
    })
    appStore.setSuccess('Project updated')
    updateList(response.data)
  }

  async function deleteProject (project) {
    const response = await api.deleteProject({
      name: get(project, ['metadata', 'name'], projectName.value),
    })
    updateList(response.data)
    appStore.setSuccess('Project deleted')
    // do not remove project from store as it will stay in terminating phase for a while
  }

  const socketEventHandler = useSocketEventHandler(useProjectStore, {
    logger,
  })
  socketEventHandler.start(500)

  async function $reset () {
    list.value = null
  }

  return {
    list,
    isInitial,
    namespace,
    namespaces,
    currentNamespaces,
    defaultNamespace,
    projectName,
    projectTitle,
    projectNameAndTitle,
    projectList,
    projectsNotMarkedForDeletion,
    project,
    projectNames,
    isCurrentNamespace,
    fetchProjects,
    createProject,
    patchProject,
    updateProject,
    deleteProject,
    projectNameByNamespace,
    projectTitleByNamespace,
    handleEvent: socketEventHandler.listener,
    $reset,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useProjectStore, import.meta.hot))
}
