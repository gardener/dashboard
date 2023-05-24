//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import findIndex from 'lodash/findIndex'
import find from 'lodash/find'
import filter from 'lodash/filter'
import matches from 'lodash/matches'

import { useAuthzStore } from './authz'
import { useApi } from '@/composables'
import { isOwnSecret } from '@/utils'

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

  const infrastructureSecretList = computed(() => {
    return filter(list.value, secret => {
      return !!secret.metadata.cloudProviderKind
    })
  })

  const dnsSecretList = computed(() => {
    return filter(list.value, secret => {
      return !!secret.metadata.dnsProviderName && isOwnSecret(secret) // secret binding not supported
    })
  })

  function getCloudProviderSecretByName ({ namespace, name }) {
    return find(list.value, eqlNameAndNamespace({ name, namespace }))
  }

  function infrastructureSecretsByCloudProfileName (cloudProfileName) {
    return filter(list.value, ['metadata.cloudProfileName', cloudProfileName])
  }

  function dnsSecretsByProviderKind (dnsProviderName) {
    return filter(list.value, secret => {
      return secret.metadata.dnsProviderName === dnsProviderName && isOwnSecret(secret) // secret binding not supported
    })
  }

  /*

  dnsSecretList(state) {
    return filter(state.cloudProviderSecrets.all, secret => {
      return !!secret.metadata.dnsProviderName && isOwnSecret(secret) // secret binding not supported
    })
  },

  */

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
    infrastructureSecretList,
    dnsSecretList,
    getCloudProviderSecretByName,
    infrastructureSecretsByCloudProfileName,
    dnsSecretsByProviderKind,
    $reset,
  }
})
