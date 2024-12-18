//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  ref,
  shallowRef,
  computed,
  inject,
  provide,
  watch,
  watchEffect,
} from 'vue'

import { useAuthzStore } from '@/store/authz'

import { cleanup } from '@/composables/helper'

import {
  decodeBase64,
  encodeBase64,
} from '@/utils'

import { useObjectMetadata } from './useObjectMetadata'

import cloneDeep from 'lodash/cloneDeep'
import get from 'lodash/get'
import isEqual from 'lodash/isEqual'
import set from 'lodash/set'
import mapValues from 'lodash/mapValues'

export function createCredentialContextComposable (options = {}) {
  const {
    authzStore = useAuthzStore(),
  } = options

  /* SecretBinding */

  /* SecretBinding initial manifest */
  const initialSecretBindingManifest = shallowRef(null)

  const normalizedInitialSecretBindingManifest = computed(() => {
    const object = cloneDeep(initialSecretBindingManifest.value)
    return normalizeSecretBindingManifest(object)
  })

  /* SecretBinding manifest */
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
    secretBindingManifest.value = {
      metadata: {
        name: '',
        namespace: get(options, ['namespace'], authzStore.namespace),
      },
      provider: {
        type: '',
      },
      secretRef: {
        name: '',
        namespace: get(options, ['namespace'], authzStore.namespace),
      },
    }
    initialSecretBindingManifest.value = cloneDeep(secretBindingManifest.value)
  }

  const isSecretBindingDirty = computed(() => {
    return !isEqual(normalizedSecretBindingManifest.value, normalizedInitialSecretBindingManifest.value)
  })

  /* SecretBinding metadata */
  const secretBindingMetadataComposable = useObjectMetadata(secretBindingManifest)
  const {
    name: secretBindingName,
    namespace: secretBindingNamespace,
  } = secretBindingMetadataComposable

  /* SecretBinding provider */
  const secretBindingProviderType = computed({
    get () {
      return get(secretBindingManifest.value, ['provider', 'type'])
    },
    set (value) {
      set(secretBindingManifest.value, ['provider', 'type'], value || undefined)
    },
  })

  /* SecretBinding secretRef */
  const secretBindingSecretRef = computed({
    get () {
      return get(secretBindingManifest.value, ['secretRef'])
    },
    set (value) {
      set(secretBindingManifest.value, ['secretRef'], value || undefined)
    },
  })

  /* Secret */

  /* Secret initial manifest */
  const initialSecretManifest = shallowRef(null)

  const normalizedInitialSecretManifest = computed(() => {
    const object = cloneDeep(initialSecretManifest.value)
    return normalizeSecretManifest(object)
  })

  /* Secret manifest */
  const secretManifest = ref({})

  function normalizeSecretManifest (value) {
    const object = Object.assign({
      apiVersion: 'v1',
      kind: 'Secret',
      type: 'Opaque',
    }, value)
    return cleanup(object)
  }

  const normalizedSecretManifest = computed(() => {
    const object = cloneDeep(secretManifest.value)
    return normalizeSecretManifest(object)
  })

  function setSecretManifest (value) {
    initialSecretManifest.value = value
    secretManifest.value = cloneDeep(initialSecretManifest.value)
  }

  function createSecretManifest () {
    secretManifest.value = {
      metadata: {
        name: '',
        namespace: get(options, ['namespace'], authzStore.namespace),
      },
      data: {},
    }
    initialSecretManifest.value = cloneDeep(secretManifest.value)
  }

  const isSecretDirty = computed(() => {
    return !isEqual(normalizedSecretManifest.value, normalizedInitialSecretManifest.value)
  })

  /* Secret metadata */
  const secretMetadataComposable = useObjectMetadata(secretManifest)
  const {
    name: secretName,
    namespace: secretNamespace,
  } = secretMetadataComposable

  /* Secret data */
  const secretData = computed({
    get () {
      return get(secretManifest.value, ['data'])
    },
    set (value) {
      set(secretManifest.value, ['data'], value || undefined)
    },
  })

  const secretStringData = computed({
    get () {
      return mapValues(secretData.value, decodeBase64)
    },
    set (value) {
      secretData.value = value ? mapValues(value, encodeBase64) : undefined
    },
  })

  function secretStringDataRefs (keyMapping) {
    const refs = {}

    for (const [, variableName] of Object.entries(keyMapping)) {
      set(refs, [variableName], ref(''))
    }

    watch(
      secretStringData,
      newValue => {
        if (newValue) {
          for (const [dataKey, variableName] of Object.entries(keyMapping)) {
            set(refs, [variableName, 'value'], get(newValue, [dataKey], ''))
          }
        }
      },
      { immediate: true, deep: true },
    )

    watchEffect(() => {
      secretStringData.value = Object.fromEntries(
        Object.entries(keyMapping).map(([dataKey, variableName]) => [
          dataKey,
          get(refs, [variableName, 'value']),
        ]),
      )
    })

    return refs
  }

  return {
    /* SecretBinding */
    secretBindingManifest: normalizedSecretBindingManifest,
    setSecretBindingManifest,
    createSecretBindingManifest,
    isSecretBindingDirty,
    secretBindingName,
    secretBindingNamespace,
    secretBindingProviderType,
    secretBindingSecretRef,

    /* Secret */
    secretManifest: normalizedSecretManifest,
    setSecretManifest,
    createSecretManifest,
    isSecretDirty,
    secretName,
    secretStringData,
    secretStringDataRefs,
    secretNamespace,
    secretData,
  }
}

export function useCredentialContext () {
  return inject('credential-context', null)
}

export function useProvideCredentialContext (options) {
  const composable = createCredentialContextComposable(options)
  provide('credential-context', composable)
  return composable
}
