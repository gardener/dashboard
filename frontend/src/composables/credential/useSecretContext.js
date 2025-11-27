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
  inject,
  provide,
} from 'vue'

import { useAuthzStore } from '@/store/authz'

import { cleanup } from '@/composables/helper'
import { useObjectMetadata } from '@/composables/useObjectMetadata'
import { credentialProviderType } from '@/composables/credential/helper'

import {
  decodeBase64,
  encodeBase64,
} from '@/utils'

import cloneDeep from 'lodash/cloneDeep'
import get from 'lodash/get'
import isEqual from 'lodash/isEqual'
import set from 'lodash/set'
import mapValues from 'lodash/mapValues'

export function createSecretContextComposable (options = {}) {
  const {
    authzStore = useAuthzStore(),
  } = options

  const initialManifest = shallowRef(null)

  const normalizedInitialManifest = computed(() => {
    const object = cloneDeep(initialManifest.value)
    return normalizeSecretManifest(object)
  })

  const manifest = ref({})

  function normalizeSecretManifest (value) {
    const object = Object.assign({
      apiVersion: 'v1',
      kind: 'Secret',
      type: 'Opaque',
    }, value)
    return cleanup(object)
  }

  const normalizedManifest = computed(() => {
    const object = cloneDeep(manifest.value)
    return normalizeSecretManifest(object)
  })

  function setSecretManifest (value) {
    initialManifest.value = value
    manifest.value = cloneDeep(initialManifest.value)
  }

  function createSecretManifest ({ name = '', labels = {} } = {}) {
    manifest.value = {
      metadata: {
        name,
        namespace: get(options, ['namespace'], authzStore.namespace),
        labels,
      },
      data: {},
    }
    initialManifest.value = cloneDeep(manifest.value)
  }

  const isSecretDirty = computed(() => {
    return !isEqual(
      normalizedManifest.value,
      normalizedInitialManifest.value,
    )
  })

  const {
    name: secretName,
    namespace: secretNamespace,
  } = useObjectMetadata(manifest)

  const dnsSecretProviderType = computed({
    get () {
      return credentialProviderType(manifest.value)
    },
    set (value) {
      const labelKey = 'dashboard.gardener.cloud/dnsProviderType'
      set(manifest.value, ['metadata', 'labels', labelKey], value)
    },
  })

  const secretData = computed({
    get () {
      return get(manifest.value, ['data'])
    },
    set (value) {
      set(manifest.value, ['data'], value)
    },
  })

  const secretStringData = computed({
    get () {
      return mapValues(secretData.value, v => {
        return v ? decodeBase64(v) : undefined
      })
    },
    set (value) {
      secretData.value = value && typeof value === 'object'
        ? mapValues(value, v => {
          return v ? encodeBase64(v) : undefined
        })
        : undefined
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
      secretStringData,
      newValue => {
        for (const [dataKey, variableName] of Object.entries(keyMapping)) {
          set(refs, [variableName, 'value'], get(newValue, [dataKey], ''))
        }
      },
      { immediate: true, deep: true },
    )

    // Whenever the refs change, encode them back into base64 in `secretData`
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
    secretManifest: normalizedManifest,
    setSecretManifest,
    createSecretManifest,
    isSecretDirty,
    secretName,
    secretNamespace,
    secretData,
    secretStringData,
    secretStringDataRefs,
    dnsSecretProviderType,
  }
}

export function useSecretContext () {
  return inject('secret-context', null)
}

export function useProvideSecretContext (options) {
  const composable = createSecretContextComposable(options)
  provide('secret-context', composable)
  return composable
}
