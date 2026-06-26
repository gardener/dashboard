//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  ref,
  computed,
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
      if (!value) {
        rawText.value = ''
      } else if (typeof value === 'string') {
        rawText.value = value
      } else if (Object.keys(value).length === 0) {
        rawText.value = ''
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

  /**
   * Parses current raw.value -> parsed object.
   * Returns undefined on parse errors or non-object results.
   */
  function parseRawTextToObject () {
    let parsed

    if (!rawText.value) {
      return null
    }

    try {
      if (isYaml.value) {
        parsed = yamlLoad(rawText.value)
      } else if (isJson.value) {
        parsed = JSON.parse(rawText.value)
      }
    } catch {
      parsed = undefined
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      parsed = undefined
    }

    return parsed
  }

  return {
    rawText,
    setRawTextWithValue,
    parseRawTextToObject,
  }
}
