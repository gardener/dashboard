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

  const initialSecretBindingManifest = shallowRef(null)

  const normalizedInitialSecretBindingManifest = computed(() => {
    const object = cloneDeep(initialSecretBindingManifest.value)
    return normalizeSecretBindingManifest(object)
  })

  const secretBindingManifest = ref({})

  function normalizeSecretBindingManifest (value) {
    const object = Object.assign({
      apiVersion: 'core.gardener.cloud/v1beta1',
      kind: 'SecretBinding',
    }, value)
    return cleanup(object)
  }

  const normalizedSecretBindingManifest = computed(() => {
    const object = cloneDeep(secretBindingManifest.value)
    return normalizeSecretBindingManifest(object)
  })

  function setSecretBindingManifest (value) {
    initialSecretBindingManifest.value = value
    secretBindingManifest.value = cloneDeep(initialSecretBindingManifest.value)
  }

  function createSecretBindingManifest () {
    const namespace = get(options, ['namespace'], authzStore.namespace)
    secretBindingManifest.value = {
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
    initialSecretBindingManifest.value = cloneDeep(secretBindingManifest.value)
  }

  const isSecretBindingDirty = computed(() => {
    return !isEqual(
      normalizedSecretBindingManifest.value,
      normalizedInitialSecretBindingManifest.value,
    )
  })

  const {
    name: secretBindingName,
    namespace: bindingNamespace,
  } = useObjectMetadata(secretBindingManifest)

  const secretBindingProviderType = computed({
    get () {
      return get(secretBindingManifest.value, ['provider', 'type'])
    },
    set (value) {
      set(secretBindingManifest.value, ['provider', 'type'], value)
    },
  })

  const secretBindingSecretRef = computed({
    get () {
      return get(secretBindingManifest.value, ['secretRef'])
    },
    set (value) {
      set(secretBindingManifest.value, ['secretRef'], value)
    },
  })

  return {
    secretBindingManifest: normalizedSecretBindingManifest,
    setSecretBindingManifest,
    createSecretBindingManifest,
    isSecretBindingDirty,
    secretBindingName,
    bindingNamespace,
    secretBindingProviderType,
    secretBindingSecretRef,
  }
}
