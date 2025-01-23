//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  ref,
  shallowRef,
  computed,
  watch,
  watchEffect,
} from 'vue'

import { useAuthzStore } from '@/store/authz'

import { cleanup } from '@/composables/helper'
import { useObjectMetadata } from '@/composables/useObjectMetadata'

import {
  decodeBase64,
  encodeBase64,
} from '@/utils'

import cloneDeep from 'lodash/cloneDeep'
import get from 'lodash/get'
import isEqual from 'lodash/isEqual'
import set from 'lodash/set'

export function useSecretContext (options = {}) {
  const {
    authzStore = useAuthzStore(),
  } = options

  const initialSecretManifest = shallowRef(null)

  const normalizedInitialSecretManifest = computed(() => {
    const object = cloneDeep(initialSecretManifest.value)
    return normalizeSecretManifest(object)
  })

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
    return !isEqual(
      normalizedSecretManifest.value,
      normalizedInitialSecretManifest.value,
    )
  })

  const {
    name: secretName,
    namespace: secretNamespace,
  } = useObjectMetadata(secretManifest)

  const secretData = computed({
    get () {
      return get(secretManifest.value, ['data'])
    },
    set (value) {
      set(secretManifest.value, ['data'], value)
    },
  })

  /**
   * Creates a set of refs for string-based secret data fields. Each key in
   * `keyMapping` maps a key in the `.data` object to a variable name. The
   * composable automatically handles base64 decoding/encoding.
   *
   * Example `keyMapping`: { 'accessKey': 'accessKeyRef', 'secretKey': 'secretKeyRef' }
   */
  function secretStringDataRefs (keyMapping) {
    const refs = {}

    // Initialize each variable name as a Vue ref
    for (const [, variableName] of Object.entries(keyMapping)) {
      set(refs, [variableName], ref(''))
    }

    // Watch changes in secretData to decode them into the refs
    watch(
      secretData,
      newValues => {
        for (const [dataKey, variableName] of Object.entries(keyMapping)) {
          const value = decodeBase64(get(newValues, [dataKey], ''))
          set(refs, [variableName, 'value'], value)
        }
      },
      { immediate: true, deep: true },
    )

    // Whenever the refs change, encode them back into base64 in `secretData`
    watchEffect(() => {
      secretData.value = Object.fromEntries(
        Object.entries(keyMapping).map(([dataKey, variableName]) => [
          dataKey,
          encodeBase64(get(refs, [variableName, 'value'])),
        ]),
      )
    })

    return refs
  }

  return {
    secretManifest: normalizedSecretManifest,
    setSecretManifest,
    createSecretManifest,
    isSecretDirty,
    secretName,
    secretNamespace,
    secretData,
    secretStringDataRefs,
  }
}
