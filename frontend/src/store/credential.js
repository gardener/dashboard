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
} from 'vue'

import { useApi } from '@/composables/useApi'

import { isOwnSecret } from '@/utils'

import { useAuthzStore } from './authz'
import { useAppStore } from './app'
import { useGardenerExtensionStore } from './gardenerExtension'
import { useCloudProfileStore } from './cloudProfile'

import findIndex from 'lodash/findIndex'
import find from 'lodash/find'
import filter from 'lodash/filter'
import matches from 'lodash/matches'
import map from 'lodash/map'

function eqlNameAndNamespace ({ namespace, name }) {
  return matches({ metadata: { namespace, name } })
}

export const useCredentialStore = defineStore('credential', () => {
  const api = useApi()
  const appStore = useAppStore()
  const authzStore = useAuthzStore()
  const gardenerExtensionStore = useGardenerExtensionStore()
  const cloudProfileStore = useCloudProfileStore()

  const credentialResourcesList = ref(null)

  const isInitial = computed(() => {
    return credentialResourcesList.value === null
  })

  function $reset () {
    credentialResourcesList.value = null
  }

  async function fetchCredentials () {
    const namespace = authzStore.namespace
    try {
      const { data: resources } = await api.getCloudProviderCredentials({ namespace })
      credentialResourcesList.value = resources
    } catch (err) {
      $reset()
      throw err
    }
  }

  const secretBindingList = computed(() => {
    return map(credentialResourcesList.value, ({ secretBinding, secret, quotas }) => {
      Object.defineProperty(secretBinding, 'secretResource', {
        value: secret,
        writable: false,
        configurable: false,
        enumerable: false,
      })
      Object.defineProperty(secretBinding, 'quotaResources', {
        value: quotas,
        writable: false,
        configurable: false,
        enumerable: false,
      })
      return secretBinding
    })
  })

  const secretList = computed(() => {
    return map(credentialResourcesList.value, 'secret')
  })

  async function createCredential ({ name, credential }) {
    const namespace = authzStore.namespace

    try {
      const { data: credentialResources } = await api.createCloudProviderCredential({ name, namespace, body: { credential } })

      appStore.setSuccess('Cloud Provider credential created')
      updateCredentialResourcesList(credentialResources)
    } catch (err) {
      $reset()
      throw err
    }
  }

  async function updateCredential ({ name, credential }) {
    const namespace = authzStore.namespace

    try {
      const { data: credentialResources } = await api.updateCloudProviderCredential({ name, namespace, body: { credential } })

      appStore.setSuccess('Cloud Provider credential updated')
      updateCredentialResourcesList(credentialResources)
    } catch (err) {
      $reset()
      throw err
    }
  }

  async function deleteCredential (name) {
    const namespace = authzStore.namespace
    await api.deleteCloudProviderCredential({ namespace, name })
    appStore.setSuccess('Cloud Provider secret deleted')
    remove({ namespace, name })
  }

  const infrastructureSecretBindingsList = computed(() => {
    return filter(secretBindingList.value, secretBinding => {
      return cloudProfileStore.sortedProviderTypeList.includes(secretBinding.provider?.type)
    })
  })

  const dnsSecretBindingsList = computed(() => {
    return filter(secretBindingList.value, secretBinding => {
      return gardenerExtensionStore.dnsProviderTypes.includes(secretBinding.provider?.type) && isOwnSecret(secretBinding) // setting secret binding not supported
    })
  })

  function getSecretByName ({ namespace, name }) {
    return find(secretList.value, eqlNameAndNamespace({ namespace, name }))
  }

  function getSecretBindingByName ({ namespace, name }) {
    return find(secretBindingList.value, eqlNameAndNamespace({ namespace, name }))
  }

  function updateCredentialResourcesList (credentialResources) {
    const { secretBinding } = credentialResources
    const index = findIndex(secretBindingList.value, eqlNameAndNamespace(secretBinding.metadata))
    if (index !== -1) {
      credentialResourcesList.value.splice(index, 1, {
        ...credentialResourcesList.value[index], // eslint-disable-line security/detect-object-injection
        ...credentialResources,
      })
    } else {
      credentialResourcesList.value.push(credentialResources)
    }
  }

  function remove ({ namespace, name }) {
    const index = findIndex(secretBindingList.value, eqlNameAndNamespace({ namespace, name }))
    if (index !== -1) {
      credentialResourcesList.value.splice(index, 1)
    }
  }

  return {
    secretBindingList,
    isInitial,
    fetchCredentials,
    updateCredential,
    createCredential,
    deleteCredential,
    infrastructureSecretBindingsList,
    dnsSecretBindingsList,
    getSecretByName,
    getSecretBindingByName,
    $reset,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCredentialStore, import.meta.hot))
}
