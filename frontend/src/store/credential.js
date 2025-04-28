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
import {
  isDnsBinding,
  isInfrastructureBinding,
  isSecretBinding,
  isCredentialsBinding,
  isSharedCredential,
} from '@/composables/credential/helper'

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
      item.kind = 'SecretBinding' // ensure kind is set (might not be set if objects are retrieved using list call)
      set(state.secretBindings, [key], item)
    })

    secrets?.forEach(item => {
      const key = namespaceNameKey(item.metadata)
      set(state.secrets, [key], item)
    })

    credentialsBindings?.forEach(item => {
      const key = namespaceNameKey(item.metadata)
      item.kind = 'CredentialsBinding' // ensure kind is set (might not be set if objects are retrieved using list call)
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
    const secretBindings = Object.values(state.secretBindings)
    const credentialsBindings = Object.values(state.credentialsBindings)

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
    const { data: { secret } } = await api.updateCloudProviderCredential({ secret: params.secret })
    _updateCloudProviderCredential({ secret })
    appStore.setSuccess(`Cloud Provider credential ${params.binding.metadata.name} updated`)
  }

  async function deleteCredential ({ bindingKind, bindingNamespace, bindingName }) {
    await api.deleteCloudProviderCredential({ bindingKind, bindingNamespace, bindingName })
    await fetchCredentials()
    appStore.setSuccess(`Cloud Provider credential ${bindingName} deleted`)
  }

  const infrastructureBindingList = computed(() => {
    return filter(cloudProviderBindingList.value, binding => {
      return isInfrastructureBinding(binding, cloudProfileStore)
    })
  })

  const dnsBindingList = computed(() => {
    return filter(cloudProviderBindingList.value, binding => {
      return isDnsBinding(binding, gardenerExtensionStore) &&
        !isSharedCredential(binding)
    })
  })

  const secretBindingList = computed(() => {
    return filter(cloudProviderBindingList.value, isSecretBinding)
  })

  const credentialsBindingList = computed(() => {
    return filter(cloudProviderBindingList.value, isCredentialsBinding)
  })

  function getSecret ({ namespace, name }) {
    return get(state.secrets, [namespaceNameKey({ namespace, name })])
  }

  function getWorkloadIdentity ({ namespace, name }) {
    return get(state.workloadIdentities, [namespaceNameKey({ namespace, name })])
  }

  function getQuota ({ namespace, name }) {
    return get(state.quotas, [namespaceNameKey({ namespace, name })])
  }

  function _updateCloudProviderCredential ({ binding, secret }) {
    if (binding) {
      const key = namespaceNameKey(binding.metadata)
      if (binding.kind === 'SecretBinding') {
        set(state.secretBindings, [key], binding)
      } else if (binding.kind === 'CredentialsBinding') {
        set(state.credentialsBindings, [key], binding)
      }
    }

    if (secret) {
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
    secretBindingList,
    credentialsBindingList,
    getSecret,
    getWorkloadIdentity,
    getQuota,
    $reset,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCredentialStore, import.meta.hot))
}
