//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  isJsonFieldType,
  isSecretFieldType,
  isStructuredFieldType,
  isStructuredSecretFieldType,
  isYamlFieldType,
  structuredFieldTypes,
} from '@/utils/inputFieldTypes'

describe('inputFieldTypes', () => {
  it('classifies structured field types', () => {
    expect(structuredFieldTypes).toEqual(new Set([
      'json',
      'json-secret',
      'yaml',
      'yaml-secret',
    ]))

    expect(isStructuredFieldType('json')).toBe(true)
    expect(isStructuredFieldType('json-secret')).toBe(true)
    expect(isStructuredFieldType('yaml')).toBe(true)
    expect(isStructuredFieldType('yaml-secret')).toBe(true)
    expect(isStructuredFieldType('text')).toBe(false)
  })

  it('classifies format and secret variants', () => {
    expect(isJsonFieldType('json')).toBe(true)
    expect(isJsonFieldType('json-secret')).toBe(true)
    expect(isJsonFieldType('yaml')).toBe(false)

    expect(isYamlFieldType('yaml')).toBe(true)
    expect(isYamlFieldType('yaml-secret')).toBe(true)
    expect(isYamlFieldType('json')).toBe(false)

    expect(isStructuredSecretFieldType('json-secret')).toBe(true)
    expect(isStructuredSecretFieldType('yaml-secret')).toBe(true)
    expect(isStructuredSecretFieldType('password')).toBe(false)

    expect(isSecretFieldType('password')).toBe(true)
    expect(isSecretFieldType('json-secret')).toBe(true)
    expect(isSecretFieldType('yaml-secret')).toBe(true)
    expect(isSecretFieldType('json')).toBe(false)
  })
})
