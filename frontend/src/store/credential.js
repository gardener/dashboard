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
    credentialsBindings: {},
    workloadIdentities: {},
    quotas: {},
  })

  function $reset () {
    state.secretBindings = {}
    state.secrets = {}
    state.credentialsBindings = {}
    state.workloadIdentities = {}
    state.quotas = {}
  }

  async function fetchCredentials () {
    const namespace = authzStore.namespace
    try {
      const { data: { secretBindings, secrets, credentialsBindings, workloadIdentities, quotas } } = await api.getCloudProviderCredentials(namespace)
      _setCredentials({ secretBindings, secrets, credentialsBindings, workloadIdentities, quotas })
    } catch (err) {
      $reset()
      throw err
    }
  }

  function _setCredentials ({ secretBindings, secrets, credentialsBindings, workloadIdentities, quotas }) {
    $reset()

    secretBindings?.forEach(item => {
      const key = namespaceNameKey(item.metadata)
      set(state.secretBindings, [key], item)
    })

    secrets?.forEach(item => {
      const key = namespaceNameKey(item.metadata)
      set(state.secrets, [key], item)
    })

    credentialsBindings?.forEach(item => {
      const key = namespaceNameKey(item.metadata)
      set(state.credentialsBindings, [key], item)
    })

    workloadIdentities?.forEach(item => {
      const key = namespaceNameKey(item.metadata)
      set(state.workloadIdentities, [key], item)
    })

    quotas?.forEach(item => {
      const key = namespaceNameKey(item.metadata)
      set(state.quotas, [key], item)
    })
  }

  const cloudProviderBindingList = computed(() => {
    const decorateBinding = (binding, kind) => {
      const isSecretBinding = kind === 'SecretBinding'
      const isCredentialsBinding = kind === 'CredentialsBinding'

      if (isSecretBinding) {
        const secret = getSecret(binding.secretRef)
        Object.defineProperty(binding, '_secret', {
          value: secret,
          configurable: true,
        })
        Object.defineProperty(binding, '_secretName', {
          value: binding.secretRef.name,
          configurable: true,
        })
      }
      if (isCredentialsBinding) {
        if (binding.credentialsRef.kind === 'Secret') {
          const secret = getSecret(binding.credentialsRef)
          Object.defineProperty(binding, '_secret', {
            value: secret,
            configurable: true,
          })
          Object.defineProperty(binding, '_secretName', {
            value: binding.credentialsRef.name,
            configurable: true,
          })
        }
        if (binding.credentialsRef.kind === 'WorkloadIdentity') {
          const workloadIdentity = getWorkloadIdentity(binding.credentialsRef)
          Object.defineProperty(binding, '_workloadIdentity', {
            value: workloadIdentity,
            configurable: true,
          })
        }
      }

      Object.defineProperty(binding, '_isSecretBinding', {
        value: isSecretBinding,
        configurable: true,
      })

      Object.defineProperty(binding, '_isCredentialsBinding', {
        value: isCredentialsBinding,
        configurable: true,
      })

      const quotas = (binding.quotas || [])
        .map(quota => get(state.quotas, namespaceNameKey(quota)))
        .filter(Boolean)

      Object.defineProperty(binding, '_quotas', {
        value: quotas,
        configurable: true,
      })

      return binding
    }

    const secretBindings = Object.values(state.secretBindings).map(binding => decorateBinding(binding, 'SecretBinding'))
    const credentialsBindings = Object.values(state.credentialsBindings).map(binding => decorateBinding(binding, 'CredentialsBinding'))

    return [...secretBindings, ...credentialsBindings]
  })

  const quotaList = computed(() => {
    return Object.values(state.quotas)
  })

  // TODO support credentials bindings
  async function createCredential (params) {
    const { data: { secretBinding, secret } } = await api.createCloudProviderCredential({ secretBinding: params.secretBinding, secret: params.secret })
    _updateCloudProviderCredential({ secretBinding, secret })
    appStore.setSuccess(`Cloud Provider credential ${secretBinding.metadata.name} created`)
  }

  // TODO support credentials bindings
  async function updateCredential (params) {
    const { data: { secretBinding, secret } } = await api.updateCloudProviderCredential({ secretBinding: params.secretBinding, secret: params.secret })
    _updateCloudProviderCredential({ secretBinding, secret })
    appStore.setSuccess(`Cloud Provider credential ${secretBinding.metadata.name} updated`)
  }

  // TODO support credentials bindings
  async function deleteCredential (name) {
    const namespace = authzStore.namespace

    await api.deleteCloudProviderCredential({ namespace, name })
    await fetchCredentials()
    appStore.setSuccess(`Cloud Provider credential ${name} deleted`)
  }

  const infrastructureBindingList = computed(() => {
    return filter(cloudProviderBindingList.value, binding => {
      return cloudProfileStore.sortedProviderTypeList.includes(binding.provider?.type)
    })
  })

  const dnsBindingList = computed(() => {
    return filter(cloudProviderBindingList.value, binding => {
      return gardenerExtensionStore.dnsProviderTypes.includes(binding.provider?.type) &&
        !!binding._secret // dns extension currently supports secrets only (no bindings)
    })
  })

  function getSecret ({ namespace, name }) {
    return get(state.secrets, [namespaceNameKey({ namespace, name })])
  }

  function getWorkloadIdentity ({ namespace, name }) {
    return get(state.workloadIdentities, [namespaceNameKey({ namespace, name })])
  }

  function getSecretBinding ({ namespace, name }) {
    return get(state.secretBindings, [namespaceNameKey({ namespace, name })])
  }

  function getCredentialsBinding ({ namespace, name }) {
    return get(state.credentialsBindings, [namespaceNameKey({ namespace, name })])
  }

  // TODO support credentials bindings
  function _updateCloudProviderCredential ({ secretBinding, secret }) {
    const key = namespaceNameKey(secretBinding.metadata)
    set(state.secretBindings, [key], secretBinding)

    if (secret) {
      // technically speaking secret should always be there as we currently only support to create secret and secret binding together
      // however this might change in the future
      const key = namespaceNameKey(secret.metadata)
      set(state.secrets, [key], secret)
    }

    // no update logic for quotas as they currently cannot be updated using the dashboard
  }

  return {
    cloudProviderBindingList,
    quotaList,
    fetchCredentials,
    _setCredentials,
    updateCredential,
    createCredential,
    deleteCredential,
    infrastructureBindingList,
    dnsBindingList,
    getSecret,
    getSecretBinding,
    getCredentialsBinding,
    getWorkloadIdentity,
    $reset,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCredentialStore, import.meta.hot))
}
