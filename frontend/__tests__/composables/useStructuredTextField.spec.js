//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import { useStructuredTextField } from '@/composables/useStructuredTextField'

describe('composables', () => {
  describe('useStructuredTextField', () => {
    it('should keep raw strings when initialized from invalid structured data', () => {
      const {
        rawText,
        setRawTextWithValue,
        parseRawTextToObject,
      } = useStructuredTextField(computed(() => 'json-secret'))

      setRawTextWithValue('{"broken":')

      expect(rawText.value).toBe('{"broken":')
      expect(parseRawTextToObject()).toBeUndefined()
    })

    it('should parse valid YAML objects and reject non-object YAML values', () => {
      const {
        rawText,
        parseRawTextToObject,
      } = useStructuredTextField(computed(() => 'yaml-secret'))

      rawText.value = 'enabled: true\n'
      expect(parseRawTextToObject()).toEqual({
        enabled: true,
      })

      rawText.value = '- item\n'
      expect(parseRawTextToObject()).toBeUndefined()
    })
  })
})
