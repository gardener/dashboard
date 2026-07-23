//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  ref,
} from 'vue'
import {
  dump as yamlDump,
  load as yamlLoad,
} from 'js-yaml'

import {
  isJsonFieldType,
  isYamlFieldType,
} from '@/utils/inputFieldTypes'

export function useStructuredTextField (typeRef) {
  const rawText = ref('')

  const isYaml = computed(() => isYamlFieldType(typeRef.value))
  const isJson = computed(() => isJsonFieldType(typeRef.value))

  function setRawTextWithValue (value) {
    try {
      if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) {
        rawText.value = ''
      } else if (typeof value === 'string') {
        rawText.value = value
      } else if (isYaml.value) {
        rawText.value = yamlDump(value)
      } else if (isJson.value) {
        rawText.value = JSON.stringify(value, null, 2)
      } else {
        rawText.value = ''
      }
    } catch {
      rawText.value = ''
    }
  }

  function parseRawTextToObject () {
    if (!rawText.value) {
      return null
    }

    let parsed
    try {
      if (isYaml.value) {
        parsed = yamlLoad(rawText.value)
      } else if (isJson.value) {
        parsed = JSON.parse(rawText.value)
      }
    } catch {
      return undefined
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return undefined
    }

    return parsed
  }

  return {
    rawText,
    setRawTextWithValue,
    parseRawTextToObject,
  }
}
