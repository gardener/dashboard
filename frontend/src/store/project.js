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
import { useLogger } from '@/composables/useLogger'

import { isTooManyRequestsError } from '@/utils/errors'

import { useAuthzStore } from './authz'
import { useAppStore } from './app'
import { useSocketStore } from './socket'

import filter from 'lodash/filter'
import find from 'lodash/find'
import findIndex from 'lodash/findIndex'
import map from 'lodash/map'
import get from 'lodash/get'
import set from 'lodash/set'
import replace from 'lodash/replace'
import throttle from 'lodash/throttle'

export const useProjectStore = defineStore('project', () => {
  const api = useApi()
  const logger = useLogger()
  const appStore = useAppStore()
  const authzStore = useAuthzStore()
  const socketStore = useSocketStore()

  const list = ref(null)

  const events = new Map()

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

  async function handleEvents (projectStore) {
    const eventValues = Array.from(events.values())
    events.clear()
    const uids = []
    const deletedUids = []
    for (const { type, uid } of eventValues) {
      if (type === 'DELETED') {
        deletedUids.push(uid)
      } else {
        uids.push(uid)
      }
    }
    try {
      const items = await socketStore.synchronize('projects', uids)
      projectStore.$patch(state => {
        const deleteItem = uid => {
          const index = findIndex(state.list, ['metadata.uid', uid])
          if (index !== -1) {
            state.list.splice(index, 1)
          }
        }
        const setItem = (uid, item) => {
          const index = findIndex(state.list, ['metadata.uid', uid])
          if (index !== -1) {
            state.list.splice(index, 1, item)
          } else {
            state.list.push(item)
          }
        }
        for (const uid of deletedUids) {
          deleteItem(uid)
        }
        for (const item of items) {
          if (item.kind === 'Status') {
            logger.info('Failed to synchronize a single project: %s', item.message)
            if (item.code === 404) {
              const uid = item.details?.uid
              if (uid) {
                deleteItem(uid)
              }
            }
          } else {
            const uid = item.metadata.uid
            setItem(uid, item)
          }
        }
      })
    } catch (err) {
      if (isTooManyRequestsError(err)) {
        logger.info('Skipped synchronization of modified projects: %s', err.message)
      } else {
        logger.error('Failed to synchronize modified projects: %s', err.message)
      }
      // Synchronization failed. Rollback project events
      for (const event of events) {
        const { uid } = event
        if (!events.has(uid)) {
          events.set(uid, event)
        }
      }
    }
  }

  const throttledHandleEvents = throttle(handleEvents, 500)

  function handleEvent (event) {
    const projectStore = this
    const { type, uid } = event
    if (!['ADDED', 'MODIFIED', 'DELETED'].includes(type)) {
      logger.error('undhandled event type', type)
      return
    }
    events.set(uid, event)
    throttledHandleEvents(projectStore)
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
    handleEvent,
    $reset,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useProjectStore, import.meta.hot))
}
