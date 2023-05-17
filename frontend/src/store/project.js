//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref, computed, toRef } from 'vue'
import { useApi, useLogger } from '@/composables'
import { useAuthzStore } from './authz'

import find from 'lodash/find'
import findIndex from 'lodash/findIndex'
import map from 'lodash/map'
import get from 'lodash/get'
import pickBy from 'lodash/pickBy'
import some from 'lodash/some'
import isEmpty from 'lodash/isEmpty'
import isObject from 'lodash/isObject'
import mapKeys from 'lodash/mapKeys'
import mapValues from 'lodash/mapValues'
import replace from 'lodash/replace'

export const useProjectStore = defineStore('project', () => {
  const logger = useLogger()
  const api = useApi()
  const authzStore = useAuthzStore()

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

  const projectFromProjectList = computed(() => {
    return find(list.value, ['metadata.namespace', namespace.value])
  })

  const projectName = computed(() => {
    return get(projectFromProjectList.value, 'metadata.name')
  })

  const projectNamesFromProjectList = computed(() => {
    return map(list.value, 'metadata.name')
  })

  const shootCustomFieldList = computed(() => {
    return map(shootCustomFields.value, (customFields, key) => {
      return {
        ...customFields,
        key,
      }
    })
  })

  const shootCustomFields = computed(() => {
    let shootCustomFields = get(projectFromProjectList.value, 'metadata.annotations["dashboard.gardener.cloud/shootCustomFields"]')
    if (!shootCustomFields) {
      return
    }

    try {
      shootCustomFields = JSON.parse(shootCustomFields)
    } catch (error) {
      logger.error('could not parse custom fields', error.message)
      return
    }

    shootCustomFields = pickBy(shootCustomFields, customField => {
      if (isEmpty(customField)) {
        return false // omit null values
      }
      if (some(customField, isObject)) {
        return false // omit custom fields with object values
      }
      return customField.name && customField.path
    })

    const defaultProperties = {
      showColumn: true,
      columnSelectedByDefault: true,
      showDetails: true,
      sortable: true,
      searchable: true,
    }
    shootCustomFields = mapKeys(shootCustomFields, (customField, key) => `Z_${key}`)
    shootCustomFields = mapValues(shootCustomFields, customField => {
      return {
        ...defaultProperties,
        ...customField,
      }
    })
    return shootCustomFields
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

  function projectNameByNamespace (namespace) {
    const project = find(list.value, ['metadata.namespace', namespace])
    return get(project, 'metadata.name') || replace(namespace, /^garden-/, '')
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
    list,
    isInitial,
    namespace,
    namespaces,
    currentNamespaces,
    defaultNamespace,
    projectName,
    projectList,
    projectFromProjectList,
    projectNamesFromProjectList,
    shootCustomFields,
    shootCustomFieldList,
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
