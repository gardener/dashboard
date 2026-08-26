//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  isJsonFieldType,
  isStructuredFieldType,
  isYamlFieldType,
  structuredFieldTypes,
} from '@/utils/inputFieldTypes'

describe('inputFieldTypes', () => {
  it('classifies structured field types', () => {
    expect(structuredFieldTypes).toEqual(new Set([
      'json',
      'yaml',
    ]))

    expect(isStructuredFieldType('json')).toBe(true)
    expect(isStructuredFieldType('yaml')).toBe(true)
    expect(isStructuredFieldType('json-secret')).toBe(false)
    expect(isStructuredFieldType('yaml-secret')).toBe(false)
    expect(isStructuredFieldType('text')).toBe(false)
  })

  it('classifies structured formats', () => {
    expect(isJsonFieldType('json')).toBe(true)
    expect(isJsonFieldType('json-secret')).toBe(false)
    expect(isJsonFieldType('yaml')).toBe(false)

    expect(isYamlFieldType('yaml')).toBe(true)
    expect(isYamlFieldType('yaml-secret')).toBe(false)
    expect(isYamlFieldType('json')).toBe(false)
  })
})
