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

  const initialManifest = shallowRef(null)

  const normalizedInitialManifest = computed(() => {
    const object = cloneDeep(initialManifest.value)
    return normalizeBindingManifest(object)
  })

  const manifest = ref({})

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

  const normalizedManifest = computed(() => {
    const object = cloneDeep(manifest.value)
    return normalizeBindingManifest(object)
  })

  function setBindingManifest (value) {
    initialManifest.value = value
    manifest.value = cloneDeep(initialManifest.value)
  }

  function createBindingManifest () {
    const namespace = get(options, ['namespace'], authzStore.namespace)
    manifest.value = {
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
    initialManifest.value = cloneDeep(manifest.value)
  }

  const isBindingDirty = computed(() => {
    return !isEqual(
      normalizedManifest.value,
      normalizedInitialManifest.value,
    )
  })

  const {
    name: bindingName,
    namespace: bindingNamespace,
  } = useObjectMetadata(manifest)

  const bindingProviderType = computed({
    get () {
      return get(manifest.value, ['provider', 'type'])
    },
    set (value) {
      set(manifest.value, ['provider', 'type'], value)
    },
  })

  const credentialsRef = computed({
    get () {
      return get(manifest.value, ['credentialsRef'])
    },
    set (value) {
      set(manifest.value, ['credentialsRef'], value)
    },
  })

  return {
    bindingManifest: normalizedManifest,
    setBindingManifest,
    createBindingManifest,
    isBindingDirty,
    bindingName,
    bindingNamespace,
    bindingProviderType,
    bindingRef: credentialsRef,
  }
}
