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
  isSecret,
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

  const { sortedInfraProviderTypeList } = storeToRefs(cloudProfileStore)
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

  async function createDnsCredential ({ secret }) {
    const { data } = await api.createDnsProviderCredential({ secret })
    _updateDnsProviderCredential({ secret: data.secret })
    const name = data.secret.metadata.name
    appStore.setSuccess(`DNS Provider credential ${name} created`)
  }

  async function createInfraCredential ({ binding, secret }) {
    const { data } = await api.createInfraProviderCredential({ binding, secret })
    _updateInfraProviderCredential({ binding: data.binding, secret: data.secret })
    const name = data.binding.metadata.name
    appStore.setSuccess(`Infrastructure credential ${name} created`)
  }

  async function updateDnsCredential ({ secret }) {
    const { data } = await api.updateDnsProviderCredential({ secret })
    _updateDnsProviderCredential({ secret: data.secret })
    const name = secret.metadata.name
    appStore.setSuccess(`DNS Provider credential ${name} updated`)
  }

  async function updateInfraCredential ({ secret, binding }) {
    const { data } = await api.updateInfraProviderCredential({ secret })
    _updateInfraProviderCredential({ binding, secret: data.secret })
    const name = binding.metadata?.name
    appStore.setSuccess(`Infrastructure Provider credential ${name} updated`)
  }

  async function deleteDnsCredential ({ credentialKind, credentialNamespace, credentialName }) {
    await api.deleteDnsProviderCredential({ credentialKind, credentialNamespace, credentialName })
    await fetchCredentials()
    appStore.setSuccess(`DNS Provider credential ${credentialName} deleted`)
  }

  async function deleteInfraCredential ({ bindingKind, bindingNamespace, bindingName }) {
    await api.deleteInfraProviderCredential({ bindingKind, bindingNamespace, bindingName })
    await fetchCredentials()
    appStore.setSuccess(`Infrastructure credential ${bindingName} deleted`)
  }

  const infrastructureBindingList = computed(() => {
    return [
      ...credentialsBindingList.value,
      ...secretBindingList.value,
    ].filter(binding => isInfrastructureBinding({ binding, infraProviderTypes: sortedInfraProviderTypeList.value }))
  })

  const dnsCredentialList = computed(() => {
    const credentials = [
      ...Object.values(state.secrets),
      ...Object.values(state.workloadIdentities),
    ]
    return credentials
      .filter(credential => isDNSCredential({ credential, dnsProviderTypes: dnsProviderTypes.value }))
      .filter(credential => isSecret(credential)) // Remove filter when DNS supports credentials of kind WorkloadIdentity
  })

  const secretBindingList = computed(() => {
    return Object.values(state.secretBindings)
  })

  const credentialsBindingList = computed(() => {
    return Object.values(state.credentialsBindings)
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

  function _updateDnsProviderCredential ({ secret }) {
    const key = namespaceNameKey(secret.metadata)
    set(state.secrets, [key], secret)
  }

  function _updateInfraProviderCredential ({ binding, secret }) {
    const bindingKey = namespaceNameKey(binding.metadata)
    if (binding.kind === 'SecretBinding') {
      set(state.secretBindings, [bindingKey], binding)
    } else if (binding.kind === 'CredentialsBinding') {
      set(state.credentialsBindings, [bindingKey], binding)
    }

    if (secret) {
      const secretKey = namespaceNameKey(secret.metadata)
      set(state.secrets, [secretKey], secret)
    }
  }

  return {
    state,
    quotaList,
    fetchCredentials,
    _setCredentials,
    updateDnsCredential,
    updateInfraCredential,
    createDnsCredential,
    createInfraCredential,
    deleteDnsCredential,
    deleteInfraCredential,
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
