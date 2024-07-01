//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
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

import { useAuthzStore } from './authz'
import { useAppStore } from './app'

import {
  find,
  findIndex,
  map,
  get,
  replace,
} from '@/lodash'

export const useProjectStore = defineStore('project', () => {
  const api = useApi()
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
      for (const { metadata: { name }, spec: { namespace } } of list.value) {
        projectNames[namespace] = name
      }
    }
    return projectNames
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

  const project = computed(() => {
    return find(list.value, ['spec.namespace', namespace.value])
  })

  const projectName = computed(() => {
    return get(project.value, 'metadata.name')
  })

  const projectNames = computed(() => {
    return map(list.value, 'metadata.name')
  })

  function updateList (obj) {
    const index = findIndex(list.value, ['metadata.name', obj.metadata.name])
    if (index !== -1) {
      list.value.splice(index, 1, Object.assign(list.value[index], obj))
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
    return projectNameMap.value[namespace] ?? replace(namespace, /^garden-/, '')
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
      name: get(project, 'metadata.name', projectName.value),
      data: project,
    })
    updateList(response.data)
  }

  async function updateProject (project) {
    const response = await api.updateProject({
      name: get(project, 'metadata.name', projectName.value),
      data: project,
    })
    appStore.setSuccess('Project updated')
    updateList(response.data)
  }

  async function deleteProject (project) {
    await api.deleteProject({
      name: get(project, 'metadata.name', projectName.value),
    })
    appStore.setSuccess('Project deleted')
    // do not remove project from store as it will stay in terminating phase for a while
  }

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
    projectList,
    project,
    projectNames,
    isCurrentNamespace,
    fetchProjects,
    createProject,
    patchProject,
    updateProject,
    deleteProject,
    projectNameByNamespace,
    $reset,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useProjectStore, import.meta.hot))
}
