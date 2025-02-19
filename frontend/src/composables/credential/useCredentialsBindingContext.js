//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  ref,
  shallowRef,
  computed,
} from 'vue'

import { useAuthzStore } from '@/store/authz'

import { cleanup } from '@/composables/helper'
import { useObjectMetadata } from '@/composables/useObjectMetadata'

import cloneDeep from 'lodash/cloneDeep'
import get from 'lodash/get'
import isEqual from 'lodash/isEqual'
import set from 'lodash/set'

export function useCredentialsBindingContext (options = {}) {
  const {
    authzStore = useAuthzStore(),
  } = options

  const initialCredentialsBindingManifest = shallowRef(null)

  const normalizedInitialCredentialsBindingManifest = computed(() => {
    const object = cloneDeep(initialCredentialsBindingManifest.value)
    return normalizeCredentialsBindingManifest(object)
  })

  const credentialsBindingManifest = ref({})

  function normalizeCredentialsBindingManifest (value) {
    const object = Object.assign({
      apiVersion: 'security.gardener.cloud/v1alpha1',
      kind: 'CredentialsBinding',
      credentialsRef: {
        apiVersion: 'v1',
        kind: 'Secret',
      },
    }, value)
    return cleanup(object)
  }

  const normalizedCredentialsBindingManifest = computed(() => {
    const object = cloneDeep(credentialsBindingManifest.value)
    return normalizeCredentialsBindingManifest(object)
  })

  function setCredentialsBindingManifest (value) {
    initialCredentialsBindingManifest.value = value
    credentialsBindingManifest.value = cloneDeep(initialCredentialsBindingManifest.value)
  }

  function createCredentialsBindingManifest () {
    const namespace = get(options, ['namespace'], authzStore.namespace)
    credentialsBindingManifest.value = {
      metadata: {
        name: '',
        namespace,
      },
      provider: {
        type: '',
      },
      credentialsRef: {
        name: '',
        namespace,
      },
    }
    initialCredentialsBindingManifest.value = cloneDeep(credentialsBindingManifest.value)
  }

  const isCredentialsBindingDirty = computed(() => {
    return !isEqual(
      normalizedCredentialsBindingManifest.value,
      normalizedInitialCredentialsBindingManifest.value,
    )
  })

  const {
    name: credentialsBindingName,
    namespace: credentialsBindingNamespace,
  } = useObjectMetadata(credentialsBindingManifest)

  const credentialsBindingProviderType = computed({
    get () {
      return get(credentialsBindingManifest.value, ['provider', 'type'])
    },
    set (value) {
      set(credentialsBindingManifest.value, ['provider', 'type'], value)
    },
  })

  const credentialsBindingCredentialsRef = computed({
    get () {
      return get(credentialsBindingManifest.value, ['credentialsRef'])
    },
    set (value) {
      set(credentialsBindingManifest.value, ['credentialsRef'], value)
    },
  })

  return {
    bindingManifest: normalizedCredentialsBindingManifest,
    setBindingManifest: setCredentialsBindingManifest,
    createBindingManifest: createCredentialsBindingManifest,
    isBindingDirty: isCredentialsBindingDirty,
    bindingName: credentialsBindingName,
    bindingNamespace: credentialsBindingNamespace,
    bindingProviderType: credentialsBindingProviderType,
    bindingRef: credentialsBindingCredentialsRef,
  }
}
