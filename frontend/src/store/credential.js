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
      const isInfrastructureBinding = cloudProfileStore.sortedProviderTypeList.includes(binding.provider?.type)
      const isDnsBinding = gardenerExtensionStore.dnsProviderTypes.includes(binding.provider?.type)

      binding.kind = kind // ensure kind is set (might not be set if objects are retrieved using list call)

      if (isSecretBinding) {
        const secret = getSecret(binding.secretRef)
        Object.defineProperties(binding, {
          _secret: {
            value: secret,
            configurable: true,
          },
          _secretName: {
            value: binding.secretRef.name,
            configurable: true,
          },
        })
      }
      if (isCredentialsBinding) {
        if (binding.credentialsRef.kind === 'Secret') {
          const secret = getSecret(binding.credentialsRef)
          Object.defineProperties(binding, {
            _secret: {
              value: secret,
              configurable: true,
            },
            _secretName: {
              value: binding.credentialsRef.name,
              configurable: true,
            },
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

      const quotas = (binding.quotas || [])
        .map(quota => get(state.quotas, namespaceNameKey(quota)))
        .filter(Boolean)

      Object.defineProperties(binding, {
        _isInfrastructureBinding: {
          value: isInfrastructureBinding,
          configurable: true,
        },
        _isDnsBinding: {
          value: isDnsBinding,
          configurable: true,
        },
        _isSecretBinding: {
          value: isSecretBinding,
          configurable: true,
        },
        _isCredentialsBinding: {
          value: isCredentialsBinding,
          configurable: true,
        },
        _quotas: {
          value: quotas,
          configurable: true,
        },
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

  async function createCredential (params) {
    const { data: { binding, secret } } = await api.createCloudProviderCredential({ binding: params.binding, secret: params.secret })
    _updateCloudProviderCredential({ binding, secret })
    appStore.setSuccess(`Cloud Provider credential ${binding.metadata.name} created`)
  }

  async function updateCredential (params) {
    const { data: { binding, secret } } = await api.updateCloudProviderCredential({ binding: params.binding, secret: params.secret })
    _updateCloudProviderCredential({ binding, secret })
    appStore.setSuccess(`Cloud Provider credential ${binding.metadata.name} updated`)
  }

  async function deleteCredential ({ namespace, secretBindingName, credentialsBindingName, secretName }) {
    const name = secretBindingName ?? credentialsBindingName
    await api.deleteCloudProviderCredential({ namespace, secretBindingName, credentialsBindingName, secretName })
    await fetchCredentials()
    appStore.setSuccess(`Cloud Provider credential ${name} deleted`)
  }

  const infrastructureBindingList = computed(() => {
    return filter(cloudProviderBindingList.value, ['_isInfrastructureBinding', true])
  })

  const dnsBindingList = computed(() => {
    return filter(cloudProviderBindingList.value, binding => {
      return binding._isDnsBinding &&
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

  function _updateCloudProviderCredential ({ binding, secret }) {
    const key = namespaceNameKey(binding.metadata)

    if (binding.kind === 'SecretBinding') {
      set(state.secretBindings, [key], binding)
    } else if (binding.kind === 'CredentialsBinding') {
      set(state.credentialsBindings, [key], binding)
    }

    if (secret) {
      // technically speaking secret should always be there as we currently only support to create secret and binding together
      // however this might change in the future
      const key = namespaceNameKey(secret.metadata)
      set(state.secrets, [key], secret)
    }

    // no update logic for quotas as they currently cannot be updated using the dashboard
  }

  function bindingsForSecret (uid) {
    return filter(cloudProviderBindingList.value, ['_secret.metadata.uid', uid])
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
    bindingsForSecret,
    $reset,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCredentialStore, import.meta.hot))
}
