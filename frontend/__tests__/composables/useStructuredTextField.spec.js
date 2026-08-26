//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import { useStructuredTextField } from '@/composables/useStructuredTextField'

describe('useStructuredTextField', () => {
  it.each([
    {
      type: 'json',
      text: '{\n  "enabled": true\n}',
      value: { enabled: true },
    },
    {
      type: 'yaml',
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
    } = useStructuredTextField(computed(() => 'json'))

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
    } = useStructuredTextField(computed(() => 'yaml'))

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
