//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref, computed, toRef } from 'vue'
import { useApi } from '@/composables'
import { useAuthnzStore } from './authz'

import find from 'lodash/find'
import findIndex from 'lodash/findIndex'
import map from 'lodash/map'
import get from 'lodash/get'

export const useProjectStore = defineStore('project', () => {
  const api = useApi()
  const authzStore = useAuthnzStore()

  const list = ref(null)

  const isInitial = computed(() => {
    return list.value === null
  })

  const namespace = toRef(authzStore, 'namespace')

  const namespaces = computed(() => {
    return map(list.value, 'metadata.namespace')
  })

  const defaultNamespace = computed(() => {
    if (namespaces.value) {
      return namespaces.value.includes('garden')
        ? 'garden'
        : namespaces.value[0]
    }
    return ''
  })

  const projectList = computed(() => {
    return list.value ?? []
  })

  const projectFromProjectList = computed(() => {
    return find(list.value, ['metadata.namespace', namespace.value])
  })

  const projectName = computed(() => {
    return get(projectFromProjectList.value, 'metadata.name')
  })

  const projectNamesFromProjectList = computed(() => {
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

  async function fetchProjects () {
    const response = await api.getProjects()
    list.value = response.data
  }

  async function createProject (obj) {
    const { metadata, data } = obj
    const response = await api.createProject({
      data: {
        metadata,
        data,
      },
    })
    updateList(response.data)
  }

  async function patchProject (obj) {
    const { metadata, data } = obj
    const response = await api.patchProject({
      namespace: metadata.namespace ?? namespace.value,
      data: {
        metadata,
        data,
      },
    })
    updateList(response.data)
  }

  async function updateProject (obj) {
    const { metadata, data } = obj
    const response = await updateProject({
      namespace: metadata.namespace ?? namespace.value,
      data: {
        metadata,
        data,
      },
    })
    updateList(response.data)
  }

  async function deleteProject (obj) {
    const { metadata } = obj
    await api.deleteProject({
      namespace: metadata.namespace ?? namespace.value,
    })
    // do not remove project from store as it will stay in termininating phase for a while
  }

  async function $reset () {
    list.value = null
  }

  return {
    isInitial,
    namespace,
    namespaces,
    defaultNamespace,
    projectName,
    projectList,
    projectFromProjectList,
    projectNamesFromProjectList,
    fetchProjects,
    createProject,
    patchProject,
    updateProject,
    deleteProject,
    $reset,
  }
})
