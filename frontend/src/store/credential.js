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

function eqlNameAndNamespace ({ namespace, name }) {
  return matches({ metadata: { namespace, name } })
}

function namespaceNameKey ({ namespace, name }) {
  return `${namespace}/${name}`
}

export const useCredentialStore = defineStore('credential', () => {
  const api = useApi()
  const appStore = useAppStore()
  const authzStore = useAuthzStore()
  const gardenerExtensionStore = useGardenerExtensionStore()
  const cloudProfileStore = useCloudProfileStore()

  const cloudProviderCredentials = ref(null)

  const isInitial = computed(() => {
    return cloudProviderCredentials.value === null
  })

  function $reset () {
    cloudProviderCredentials.value = null
  }

  async function fetchCredentials () {
    const namespace = authzStore.namespace
    try {
      const { data: credentials } = await api.getCloudProviderCredentials({ namespace })
      cloudProviderCredentials.value = credentials
    } catch (err) {
      $reset()
      throw err
    }
  }

  const secretBindingList = computed(() => {
    const secretMap = new Map(cloudProviderCredentials.value?.secrets?.map(secret => [namespaceNameKey(secret.metadata), secret]))
    const quotaMap = new Map(cloudProviderCredentials.value?.quotas?.map(quota => [namespaceNameKey(quota.metadata), quota]))

    return cloudProviderCredentials.value?.secretBindings?.map(secretBinding => {
      const secret = secretMap.get(namespaceNameKey(secretBinding.secretRef))
      Object.defineProperty(secretBinding, 'secret', {
        get () {
          return secret
        },
        configurable: true,
        enumerable: false,
      })

      const quotaItems = (secretBinding.quotas || [])
        .map(quota => quotaMap.get(namespaceNameKey(quota)))
        .filter(item => item !== undefined)

      Object.defineProperty(secretBinding, 'quotaItems', {
        get () {
          return quotaItems
        },
        configurable: true,
        enumerable: false,
      })

      return secretBinding
    })
  })

  const secretList = computed(() => {
    return cloudProviderCredentials.value.secrets
  })

  async function createCredential ({ name, ...params }) {
    const namespace = authzStore.namespace

    try {
      const { data: credentials } = await api.createCloudProviderCredential({ name, namespace, params })

      appStore.setSuccess('Cloud Provider credential created')
      updatecloudProviderCredentials(credentials)
    } catch (err) {
      $reset()
      throw err
    }
  }

  async function updateCredential ({ name, ...params }) {
    const namespace = authzStore.namespace

    try {
      const { data: credentials } = await api.updateCloudProviderCredential({ name, namespace, params })

      appStore.setSuccess('Cloud Provider credential updated')
      updatecloudProviderCredentials(credentials)
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

  function updatecloudProviderCredentials (credentials) {
    const { secretBinding } = credentials
    const index = findIndex(secretBindingList.value, eqlNameAndNamespace(secretBinding.metadata))
    if (index !== -1) {
      cloudProviderCredentials.value.splice(index, 1, {
        ...cloudProviderCredentials.value[index], // eslint-disable-line security/detect-object-injection
        ...credentials,
      })
    } else {
      cloudProviderCredentials.value.push(credentials)
    }
  }

  function remove ({ namespace, name }) {
    const index = findIndex(secretBindingList.value, eqlNameAndNamespace({ namespace, name }))
    if (index !== -1) {
      cloudProviderCredentials.value.splice(index, 1)
    }
  }

  return {
    cloudProviderCredentials,
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
