//
// SPDX-FileCopyrightText: Contributors to the Gardener project
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

function credentialParams ({ secret, workloadIdentity }) {
  return {
    ...(secret !== undefined ? { secret } : {}),
    ...(workloadIdentity !== undefined ? { workloadIdentity } : {}),
  }
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

  async function fetchCredentials (namespace = authzStore.namespace) {
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

  const quotaList = computed(() => {
    return Object.values(state.quotas)
  })

  async function createDnsCredential ({ secret, workloadIdentity }) {
    const { data } = await api.createDnsProviderCredential(credentialParams({ secret, workloadIdentity }))
    const credential = data.secret ?? data.workloadIdentity
    _updateDnsProviderCredential({ credential })
    const name = credential.metadata.name
    appStore.setSuccess(`DNS Provider credential ${name} created`)
    return credential
  }

  async function createInfraCredential ({ binding, secret, workloadIdentity }) {
    const { data } = await api.createInfraProviderCredential({ binding, ...credentialParams({ secret, workloadIdentity }) })
    const credential = data.secret ?? data.workloadIdentity
    _updateInfraProviderCredential({ binding: data.binding, credential })
    const name = data.binding.metadata.name
    appStore.setSuccess(`Infrastructure credential ${name} created`)
    return credential
  }

  async function updateDnsCredential ({ secret, workloadIdentity }) {
    const { data } = await api.updateDnsProviderCredential(credentialParams({ secret, workloadIdentity }))
    const credential = data.secret ?? data.workloadIdentity
    _updateDnsProviderCredential({ credential })
    const name = credential.metadata.name
    appStore.setSuccess(`DNS Provider credential ${name} updated`)
    return credential
  }

  async function updateInfraCredential ({ secret, workloadIdentity, binding }) {
    const { data } = await api.updateInfraProviderCredential(credentialParams({ secret, workloadIdentity }))
    const credential = data.secret ?? data.workloadIdentity
    _updateInfraProviderCredential({ binding, credential })
    const name = binding.metadata?.name
    appStore.setSuccess(`Infrastructure Provider credential ${name} updated`)
    return credential
  }

  async function deleteDnsCredential ({ credentialKind, credentialNamespace, credentialName }) {
    try {
      await api.deleteDnsProviderCredential({ credentialKind, credentialNamespace, credentialName })
    } catch (err) {
      await fetchCredentials().catch(() => {})
      throw err
    }
    await fetchCredentials()
    const credentialLabel = credentialKind === 'WorkloadIdentity' ? 'Workload Identity' : 'Secret'
    appStore.setSuccess(`DNS Provider ${credentialLabel} ${credentialName} deleted`)
  }

  async function deleteInfraCredential ({ bindingKind, bindingNamespace, bindingName, preserveCredential = false }) {
    let data
    try {
      const response = await api.deleteInfraProviderCredential({
        bindingKind,
        bindingNamespace,
        bindingName,
        preserveCredential,
      })
      data = response?.data
    } catch (err) {
      await fetchCredentials().catch(() => {})
      throw err
    }
    await fetchCredentials().catch(() => {})
    const credentialKind = data?.credentialRef?.kind ?? 'Secret'
    const credentialName = data?.credentialRef?.name
    const credentialLabel = [credentialKind, credentialName].filter(Boolean).join(' ')
    let message = `Deletion of ${bindingKind} ${bindingName} was requested`
    if (data?.credentialDeletionRequested) {
      message = `Deletion of ${credentialLabel} and ${bindingKind} ${bindingName} was requested`
    } else if (data?.credentialMissing) {
      message += `. ${credentialLabel} was already missing`
    } else if (data?.credentialPreserved) {
      message += `. ${credentialLabel} was preserved`
    } else if (data?.credentialDeletionUnconfirmed) {
      const credentialPath = [data.credentialRef?.namespace, credentialName].filter(Boolean).join('/')
      const details = data.credentialDeletionError
        ? `Details: ${data.credentialDeletionError}`
        : undefined
      const text = [
        `${credentialLabel} deletion could not be confirmed.`,
        `Verify ${credentialPath} before retrying manually.`,
        details,
      ].filter(Boolean).join(' ')
      appStore.setError({
        title: message,
        text,
      })
      return data
    }
    appStore.setSuccess(message)
    return data
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

  function _updateCredential (credential) {
    if (!credential) {
      return
    }
    const key = namespaceNameKey(credential.metadata)
    if (credential.kind === 'Secret') {
      set(state.secrets, [key], credential)
    } else if (credential.kind === 'WorkloadIdentity') {
      set(state.workloadIdentities, [key], credential)
    }
  }

  function _updateDnsProviderCredential ({ credential }) {
    _updateCredential(credential)
  }

  function _updateInfraProviderCredential ({ binding, credential }) {
    const bindingKey = namespaceNameKey(binding.metadata)
    if (binding.kind === 'SecretBinding') {
      set(state.secretBindings, [bindingKey], binding)
    } else if (binding.kind === 'CredentialsBinding') {
      set(state.credentialsBindings, [bindingKey], binding)
    }

    _updateCredential(credential)
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
