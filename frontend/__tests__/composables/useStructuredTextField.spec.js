//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import { useStructuredTextField } from '@/composables/useStructuredTextField'

describe('useStructuredTextField', () => {
  it.each([
    {
      type: 'json-secret',
      text: '{\n  "enabled": true\n}',
      value: { enabled: true },
    },
    {
      type: 'yaml-secret',
      text: 'enabled: true\n',
      value: { enabled: true },
    },
  ])('serializes and parses $type objects', ({ type, text, value }) => {
    const {
      rawText,
      setRawTextWithValue,
      parseRawTextToObject,
    } = useStructuredTextField(computed(() => type))

    setRawTextWithValue(value)

    expect(rawText.value).toBe(text)
    expect(parseRawTextToObject()).toEqual(value)
  })

  it('keeps invalid structured strings so users can correct them', () => {
    const {
      rawText,
      setRawTextWithValue,
      parseRawTextToObject,
    } = useStructuredTextField(computed(() => 'json-secret'))

    setRawTextWithValue('{"broken":')

    expect(rawText.value).toBe('{"broken":')
    expect(parseRawTextToObject()).toBeUndefined()
  })

  it.each([
    ['array', '- item\n'],
    ['scalar', 'value\n'],
  ])('rejects a YAML %s root', (description, value) => {
    const {
      rawText,
      parseRawTextToObject,
    } = useStructuredTextField(computed(() => 'yaml-secret'))

    rawText.value = value

    expect(parseRawTextToObject()).toBeUndefined()
  })

  it('normalizes empty values to empty text', () => {
    const {
      rawText,
      setRawTextWithValue,
      parseRawTextToObject,
    } = useStructuredTextField(computed(() => 'yaml'))

    setRawTextWithValue({})
    expect(rawText.value).toBe('')
    expect(parseRawTextToObject()).toBeNull()

    setRawTextWithValue(null)
    expect(rawText.value).toBe('')
  })
})
