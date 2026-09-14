//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  ref,
  shallowRef,
  computed,
  inject,
  provide,
} from 'vue'
import {
  dump as yamlDump,
  load as yamlLoad,
} from 'js-yaml'

import { useAuthzStore } from '@/store/authz'

import { cleanup } from '@/composables/helper'
import { useObjectMetadata } from '@/composables/useObjectMetadata'
import {
  credentialProviderType,
  resolveSecretDataAliases,
} from '@/composables/credential/helper'

import {
  decodeBase64,
  encodeBase64,
} from '@/utils'
import {
  isStructuredFieldType,
  isYamlFieldType,
} from '@/utils/inputFieldTypes'

import cloneDeep from 'lodash/cloneDeep'
import get from 'lodash/get'
import isEqual from 'lodash/isEqual'
import set from 'lodash/set'
import unset from 'lodash/unset'
import mapValues from 'lodash/mapValues'

function parseSecretFieldValue (value, field) {
  if (!isStructuredFieldType(field?.type) || typeof value !== 'string' || !value) {
    return value
  }

  try {
    const parsed = isYamlFieldType(field.type)
      ? yamlLoad(value)
      : JSON.parse(value)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed
    }
  } catch (err) {
    // Keep the raw value so the structured input can show and validate it.
  }

  return value
}

function encodeSecretFieldValue (value, field) {
  if (value == null || (value === '' && field?.omitWhenEmpty)) {
    return undefined
  }
  if (typeof value === 'string') {
    return encodeBase64(value)
  }
  if (isYamlFieldType(field.type)) {
    return encodeBase64(yamlDump(value))
  }
  return encodeBase64(JSON.stringify(value))
}

/**
 * Creates reactive state and helpers for editing Kubernetes Secret manifests.
 * String and structured field helpers handle base64 decoding and encoding.
 */
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

  function getSecretFieldValues (fieldDefinitions = []) {
    const fields = Array.isArray(fieldDefinitions) ? fieldDefinitions : []
    const data = resolveSecretDataAliases(secretData.value ?? {}, fields)

    return Object.fromEntries(
      fields
        .filter(field => Object.hasOwn(data, field.key))
        .map(field => {
          const encodedValue = data[field.key]
          const value = encodedValue == null
            ? undefined
            : decodeBase64(encodedValue)
          return [field.key, parseSecretFieldValue(value, field)]
        }),
    )
  }

  function setSecretFieldValues (fieldDefinitions = [], fieldValues) {
    const nextData = { ...secretData.value }
    const fields = Array.isArray(fieldDefinitions) ? fieldDefinitions : []

    for (const field of fields) {
      for (const alias of field.aliases ?? []) {
        unset(nextData, [alias])
      }
      const encodedValue = encodeSecretFieldValue(fieldValues?.[field.key], field)
      if (encodedValue === undefined) {
        delete nextData[field.key]
      } else {
        nextData[field.key] = encodedValue
      }
    }

    secretData.value = nextData
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
    getSecretFieldValues,
    setSecretFieldValues,
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
