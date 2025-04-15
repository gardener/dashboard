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
import merge from 'lodash/merge'

export function useCredentialsBindingContext (options = {}) {
  const {
    authzStore = useAuthzStore(),
  } = options

  const initialBindingManifest = shallowRef(null)

  const normalizedInitialBindingManifest = computed(() => {
    const object = cloneDeep(initialBindingManifest.value)
    return normalizeBindingManifest(object)
  })

  const bindingManifest = ref({})

  function normalizeBindingManifest (value) {
    const object = merge({
      apiVersion: 'security.gardener.cloud/v1alpha1',
      kind: 'CredentialsBinding',
      credentialsRef: {
        apiVersion: 'v1',
        kind: 'Secret',
      },
    }, value)
    return cleanup(object)
  }

  const normalizedBindingManifest = computed(() => {
    const object = cloneDeep(bindingManifest.value)
    return normalizeBindingManifest(object)
  })

  function setBindingManifest (value) {
    initialBindingManifest.value = value
    bindingManifest.value = cloneDeep(initialBindingManifest.value)
  }

  function createBindingManifest () {
    const namespace = get(options, ['namespace'], authzStore.namespace)
    bindingManifest.value = {
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
    initialBindingManifest.value = cloneDeep(bindingManifest.value)
  }

  const isBindingDirty = computed(() => {
    return !isEqual(
      normalizedBindingManifest.value,
      normalizedInitialBindingManifest.value,
    )
  })

  const {
    name: bindingName,
    namespace: bindingNamespace,
  } = useObjectMetadata(bindingManifest)

  const bindingProviderType = computed({
    get () {
      return get(bindingManifest.value, ['provider', 'type'])
    },
    set (value) {
      set(bindingManifest.value, ['provider', 'type'], value)
    },
  })

  const bindingCredentialsRef = computed({
    get () {
      return get(bindingManifest.value, ['credentialsRef'])
    },
    set (value) {
      set(bindingManifest.value, ['credentialsRef'], value)
    },
  })

  return {
    bindingManifest: normalizedBindingManifest,
    setBindingManifest,
    createBindingManifest,
    isBindingDirty,
    bindingName,
    bindingNamespace,
    bindingProviderType,
    bindingRef: bindingCredentialsRef,
  }
}
