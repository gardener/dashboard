//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineStore,
  acceptHMRUpdate,
  storeToRefs,
} from 'pinia'
import {
  computed,
  reactive,
} from 'vue'

import { useApi } from '@/composables/useApi'
import {
  isInfrastructureBinding,
  isDNSCredential,
} from '@/composables/credential/helper'

import { useAuthzStore } from './authz'
import { useAppStore } from './app'
import { useGardenerExtensionStore } from './gardenerExtension'
import { useCloudProfileStore } from './cloudProfile'

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

  const { sortedProviderTypeList } = storeToRefs(cloudProfileStore)
  const { dnsProviderTypes } = storeToRefs(gardenerExtensionStore)

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
      item.kind = 'Secret' // ensure kind is set (might not be set if objects are retrieved using list call)
      set(state.secrets, [key], item)
    })

    credentialsBindings?.forEach(item => {
      const key = namespaceNameKey(item.metadata)
      item.kind = 'CredentialsBinding' // ensure kind is set (might not be set if objects are retrieved using list call)
      set(state.credentialsBindings, [key], item)
    })

    workloadIdentities?.forEach(item => {
      const key = namespaceNameKey(item.metadata)
      item.kind = 'WorkloadIdentity' // ensure kind is set (might not be set if objects are retrieved using list call)
      set(state.workloadIdentities, [key], item)
    })

    quotas?.forEach(item => {
      const key = namespaceNameKey(item.metadata)
      set(state.quotas, [key], item)
    })
  }

  const quotaList = computed(() => {
    return Object.values(state.quotas)
  })

  async function createCredential (params) {
    const { data: { binding, secret } } = await api.createCloudProviderCredential({ binding: params.binding, secret: params.secret })
    _updateCloudProviderCredential({ binding, secret })
    const name = binding?.metadata?.name || secret.metadata.name
    appStore.setSuccess(`Cloud Provider credential ${name} created`)
  }

  async function updateCredential (params) {
    const { data: { secret } } = await api.updateCloudProviderCredential({ secret: params.secret })
    _updateCloudProviderCredential({ secret })
    const name = params.binding?.metadata?.name || secret.metadata.name
    appStore.setSuccess(`Cloud Provider credential ${name} updated`)
  }

  async function deleteCredential (params) {
    if (params.credentialKind) {
      const { credentialKind, credentialNamespace, credentialName } = params
      await api.deleteCloudProviderCredential({ credentialKind, credentialNamespace, credentialName })
      await fetchCredentials()
      appStore.setSuccess(`Cloud Provider credential ${credentialName} deleted`)
      return
    }
    const { bindingKind, bindingNamespace, bindingName } = params
    await api.deleteCloudProviderCredential({ bindingKind, bindingNamespace, bindingName })
    await fetchCredentials()
    appStore.setSuccess(`Cloud Provider credential ${bindingName} deleted`)
  }

  const infrastructureBindingList = computed(() => {
    return [
      ...secretBindingList.value,
      ...credentialsBindingList.value,
    ].filter(binding => isInfrastructureBinding(binding, sortedProviderTypeList.value))
  })

  const dnsCredentialList = computed(() => {
    return [
      ...Object.values(state.secrets),
      ...Object.values(state.workloadIdentities),
    ].filter(credential => isDNSCredential(credential, dnsProviderTypes.value))
  })

  const secretBindingList = computed(() =>
    Object.values(state.secretBindings),
  )

  const credentialsBindingList = computed(() =>
    Object.values(state.credentialsBindings),
  )

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
    state,
    quotaList,
    fetchCredentials,
    _setCredentials,
    updateCredential,
    createCredential,
    deleteCredential,
    infrastructureBindingList,
    dnsCredentialList,
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
