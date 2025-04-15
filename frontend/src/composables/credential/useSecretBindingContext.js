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

export function useSecretBindingContext (options = {}) {
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
    const object = Object.assign({
      apiVersion: 'core.gardener.cloud/v1beta1',
      kind: 'SecretBinding',
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
      secretRef: {
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

  const bindingSecretRef = computed({
    get () {
      return get(bindingManifest.value, ['secretRef'])
    },
    set (value) {
      set(bindingManifest.value, ['secretRef'], value)
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
    bindingRef: bindingSecretRef,
  }
}
