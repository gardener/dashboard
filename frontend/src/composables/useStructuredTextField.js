import {
  ref,
  computed,
} from 'vue'
import yaml from 'js-yaml'

export function useStructuredTextField (typeRef) {
  const rawText = ref('')

  const isYaml = computed(() => typeRef.value === 'yaml' || typeRef.value === 'yaml-secret')
  const isJson = computed(() => typeRef.value === 'json' || typeRef.value === 'json-secret')

  function setRawTextWithObject (parsedValue) {
    try {
      if (Object.keys(parsedValue).length === 0) {
        rawText.value = ''
      } else if (isYaml.value) {
        rawText.value = yaml.dump(parsedValue)
      } else if (isJson.value) {
        rawText.value = JSON.stringify(parsedValue, null, 2)
      } else {
        rawText.value = ''
      }
    } catch {
      rawText.value = ''
    }
  }

  /**
   * Parses current raw.value -> parsed object.
   * Returns {} on parse errors or non-object results.
   */
  function parseRawTextToObject () {
    let parsed

    if (!rawText.value) {
      return null
    }

    try {
      if (isYaml.value) {
        parsed = yaml.load(rawText.value)
      } else if (isJson.value) {
        parsed = JSON.parse(rawText.value)
      }
    } catch {
      parsed = undefined
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      parsed = ''
    }

    return parsed
  }

  return {
    rawText,
    setRawTextWithObject,
    parseRawTextToObject,
  }
}
