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
  computed,
  reactive,
} from 'vue'

import { useApi } from '@/composables/useApi'

import { hasOwnSecret } from '@/utils'

import { useAuthzStore } from './authz'
import { useAppStore } from './app'
import { useGardenerExtensionStore } from './gardenerExtension'
import { useCloudProfileStore } from './cloudProfile'

import filter from 'lodash/filter'
import set from 'lodash/set'
import get from 'lodash/get'

function namespaceNameKey ({ namespace, name }) {
  return `${namespace}/${name}`
}

export const useCredentialStore = defineStore('credential', () => {
  const api = useApi()
  const appStore = useAppStore()
  const authzStore = useAuthzStore()
  const gardenerExtensionStore = useGardenerExtensionStore()
  const cloudProfileStore = useCloudProfileStore()

  const state = reactive({
    secretBindings: {},
    secrets: {},
    quotas: {},
  })

  function $reset () {
    state.secretBindings = {}
    state.secrets = {}
    state.quotas = {}
  }

  async function fetchCredentials () {
    const namespace = authzStore.namespace
    try {
      const { data: { secretBindings, secrets, quotas } } = await api.getCloudProviderCredentials(namespace)
      _setCredentials({ secretBindings, secrets, quotas })
    } catch (err) {
      $reset()
      throw err
    }
  }

  function _setCredentials ({ secretBindings, secrets, quotas }) {
    $reset()

    secretBindings?.forEach(item => {
      const key = namespaceNameKey(item.metadata)
      set(state.secretBindings, [key], item)
    })

    secrets?.forEach(item => {
      const key = namespaceNameKey(item.metadata)
      set(state.secrets, [key], item)
    })

    quotas?.forEach(item => {
      const key = namespaceNameKey(item.metadata)
      set(state.quotas, [key], item)
    })
  }

  const secretBindingList = computed(() => {
    const secretBindings = Object.values(state.secretBindings)
    return secretBindings.map(secretBinding => {
      const secret = getSecret(secretBinding.secretRef)
      Object.defineProperty(secretBinding, '_secret', {
        value: secret,
        configurable: true,
        enumerable: false,
      })

      const quotas = (secretBinding.quotas || [])
        .map(quota => get(state.quotas, namespaceNameKey(quota)))
        .filter(Boolean)

      Object.defineProperty(secretBinding, '_quotas', {
        value: quotas,
        configurable: true,
        enumerable: false,
      })

      return secretBinding
    })
  })

  const secretList = computed(() => {
    return Object.values(state.secrets)
  })

  const quotaList = computed(() => {
    return Object.values(state.quotas)
  })

  async function createCredential (params) {
    const { data: { secretBinding, secret } } = await api.createCloudProviderCredential({ secretBinding: params.secretBinding, secret: params.secret })
    _updateCloudProviderCredential({ secretBinding, secret })
    appStore.setSuccess(`Cloud Provider credential ${secretBinding.metadata.name} created`)
  }

  async function updateCredential (params) {
    const { data: { secretBinding, secret } } = await api.updateCloudProviderCredential({ secretBinding: params.secretBinding, secret: params.secret })
    _updateCloudProviderCredential({ secretBinding, secret })
    appStore.setSuccess(`Cloud Provider credential ${secretBinding.metadata.name} updated`)
  }

  async function deleteCredential (name) {
    const namespace = authzStore.namespace

    await api.deleteCloudProviderCredential({ namespace, name })
    await fetchCredentials()
    appStore.setSuccess(`Cloud Provider credential ${name} deleted`)
  }

  const infrastructureSecretBindingsList = computed(() => {
    return filter(secretBindingList.value, secretBinding => {
      return cloudProfileStore.sortedProviderTypeList.includes(secretBinding.provider?.type)
    })
  })

  const dnsSecretBindingsList = computed(() => {
    return filter(secretBindingList.value, secretBinding => {
      return gardenerExtensionStore.dnsProviderTypes.includes(secretBinding.provider?.type) && hasOwnSecret(secretBinding) // setting secret binding not supported
    })
  })

  function getSecret ({ namespace, name }) {
    return get(state.secrets, [namespaceNameKey({ namespace, name })])
  }

  function getSecretBinding ({ namespace, name }) {
    return get(state.secretBindings, [namespaceNameKey({ namespace, name })])
  }

  function _updateCloudProviderCredential ({ secretBinding, secret }) {
    const key = namespaceNameKey(secretBinding.metadata)
    set(state.secretBindings, [key], secretBinding)

    if (secret) {
      // technically speaking secret hould always be there as we currently only support to create secret and secret binding together
      // however this might change in the future
      const key = namespaceNameKey(secret.metadata)
      set(state.secrets, [key], secret)
    }

    // no update logic for quotas as they currently cannot be updated using the dashboard
  }

  return {
    secretBindingList,
    secretList,
    quotaList,
    fetchCredentials,
    _setCredentials,
    updateCredential,
    createCredential,
    deleteCredential,
    infrastructureSecretBindingsList,
    dnsSecretBindingsList,
    getSecret,
    getSecretBinding,
    $reset,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCredentialStore, import.meta.hot))
}
