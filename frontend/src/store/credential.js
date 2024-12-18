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

import { isOwnSecret } from '@/utils'

import { useAuthzStore } from './authz'
import { useAppStore } from './app'
import { useGardenerExtensionStore } from './gardenerExtension'
import { useCloudProfileStore } from './cloudProfile'

import filter from 'lodash/filter'
import isEmpty from 'lodash/isEmpty'
import set from 'lodash/set'
import get from 'lodash/get'
import some from 'lodash/some'

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

  const isInitial = computed(() => {
    return isEmpty(state.secretBindings)
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
      setCredentials({ secretBindings, secrets, quotas })
    } catch (err) {
      $reset()
      throw err
    }
  }

  function setCredentials ({ secretBindings, secrets, quotas }) {
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
    try {
      const { data: { secretBinding, secret } } = await api.createCloudProviderCredential({ secretBinding: params.secretBinding, secret: params.secret })
      updateCloudProviderCredential({ secretBinding, secret })
      appStore.setSuccess('Cloud Provider credential created')
    } catch (err) {
      $reset()
      throw err
    }
  }

  async function updateCredential (params) {
    try {
      const { data: { secretBinding, secret } } = await api.updateCloudProviderCredential({ secretBinding: params.secretBinding, secret: params.secret })
      updateCloudProviderCredential({ secretBinding, secret })
      appStore.setSuccess('Cloud Provider credential updated')
    } catch (err) {
      $reset()
      throw err
    }
  }

  async function deleteCredential (name) {
    const namespace = authzStore.namespace

    try {
      await api.deleteCloudProviderCredential({ namespace, name })
      remove({ namespace, name })
      appStore.setSuccess('Cloud Provider credential deleted')
    } catch (err) {
      $reset()
      throw err
    }
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

  function getSecret ({ namespace, name }) {
    return get(state.secrets, namespaceNameKey({ namespace, name }))
  }

  function getSecretBinding ({ namespace, name }) {
    return get(state.secretBindings, namespaceNameKey({ namespace, name }))
  }

  function updateCloudProviderCredential ({ secretBinding, secret }) {
    const key = namespaceNameKey(secretBinding.metadata)
    set(state.secretBindings, [key], secretBinding)

    if (secret) {
      const key = namespaceNameKey(secret.metadata)
      set(state.secrets, [key], secret)
    }

    // no update logic for quotas as they currently cannot be updated using the dashboard
  }

  function remove ({ namespace, name }) {
    const secretBinding = getSecretBinding({ namespace, name })
    const secretRef = secretBinding.secretRef
    const secretBindingKey = namespaceNameKey(secretBinding.metadata)

    delete state.secretBindings[secretBindingKey] // eslint-disable-line security/detect-object-injection

    if (secretRef.namespace === namespace) {
      const isSecretStillReferenced = some(secretBindingList.value, { secretRef })
      if (!isSecretStillReferenced) {
        const secretKey = namespaceNameKey(secretRef)
        delete state.secrets[secretKey] // eslint-disable-line security/detect-object-injection
      }
    }

    if (secretBinding.quotas) {
      secretBinding.quotas.forEach(quotaRef => {
        const isQuotaStillReferenced = some(secretBindingList.value, { quotas: [quotaRef] })
        if (!isQuotaStillReferenced) {
          const quotaKey = namespaceNameKey(quotaRef)
          delete state.quotas[quotaKey] // eslint-disable-line security/detect-object-injection
        }
      })
    }
  }

  return {
    secretBindingList,
    secretList,
    quotaList,
    isInitial,
    fetchCredentials,
    setCredentials,
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
