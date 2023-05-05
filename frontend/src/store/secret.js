//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import findIndex from 'lodash/findIndex'
import find from 'lodash/find'
import matches from 'lodash/matches'

import { useAuthzStore } from './authz'
import { useApi } from '@/composables'

function eqlNameAndNamespace ({ namespace, name }) {
  return matches({ metadata: { namespace, name } })
}

export const useSecretStore = defineStore('secret', () => {
  const api = useApi()
  const authzStore = useAuthzStore()

  const list = ref(null)

  const isInitial = computed(() => {
    return list.value === null
  })

  function $reset () {
    list.value = null
  }

  async function fetchSecrets () {
    const namespace = authzStore.namespace
    try {
      const response = await api.getCloudProviderSecrets({ namespace })
      list.value = response.data
    } catch (err) {
      $reset()
      throw err
    }
  }

  function getSecret ({ namespace, name }) {
    return find(list.value, eqlNameAndNamespace({ namespace, name }))
  }

  async function updateSecret (obj) {
    const {
      namespace = authzStore.namespace,
      name,
    } = obj.metadata
    const response = await api.updateCloudProviderSecret({ namespace, name, data: obj })
    replace(response.data)
  }

  async function createSecret (obj) {
    const {
      namespace = authzStore.namespace,
    } = obj.metadata
    const response = await api.createCloudProviderSecret({ namespace, data: obj })
    replace(response.data)
  }

  async function deleteSecret (name) {
    const namespace = authzStore.namespace
    const response = await api.deleteCloudProviderSecret({ namespace, name })
    remove(response.data)
  }

  function replace (obj) {
    const index = findIndex(list.value, eqlNameAndNamespace(obj.metadata))
    if (index !== -1) {
      list.value.splice(index, 1, {
        ...list.value[index],
        ...obj,
      })
    } else {
      list.value.push(obj)
    }
  }

  function remove (obj) {
    const index = findIndex(list.value, eqlNameAndNamespace(obj.metadata))
    if (index !== -1) {
      list.value.splice(index, 1)
    }
  }

  return {
    list,
    isInitial,
    fetchSecrets,
    getSecret,
    updateSecret,
    createSecret,
    deleteSecret,
    $reset,
  }
})
