//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  ref,
  reactive,
} from 'vue'
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from 'vitest'

import { useProjectShootCustomFields } from '@/composables/useProjectShootCustomFields'
import {
  formatValue,
  isCustomField,
} from '@/composables/useProjectShootCustomFields/helper'

// Mock dependencies
vi.mock('@/composables/useLogger', () => ({
  useLogger: () => ({
    error: vi.fn(),
  }),
}))

let annotations

beforeEach(() => {
  annotations = reactive({})
})

vi.mock('@/composables/useProjectMetadata', () => ({
  useProjectMetadata: projectItem => ({
    getProjectAnnotation: vi.fn(key => annotations[key] || null),
    setProjectAnnotation: vi.fn((key, value) => {
      annotations[key] = value
    }),
    unsetProjectAnnotation: vi.fn(key => {
      delete annotations[key]
    }),
  }),
}))

describe('useProjectShootCustomFields', () => {
  let projectItem
  let options

  beforeEach(() => {
    projectItem = ref({})
    options = {}
  })

  it('should initialize shootCustomFields correctly with legacy data', () => {
    annotations['dashboard.gardener.cloud/shootCustomFields'] = JSON.stringify({
      shootStatus: {
        name: 'Shoot Status',
        path: 'metadata.labels["shoot.gardener.cloud/status"]',
        icon: 'mdi-heart-pulse',
        tooltip: 'Indicates the health status of the cluster',
        defaultValue: 'unknown',
        showColumn: true,
        columnSelectedByDefault: true,
        weight: 950,
        searchable: true,
        sortable: true,
        showDetails: true,
      },
      networking: {
        name: 'Networking Type',
        path: 'spec.networking.type',
        icon: 'mdi-table-network',
        showColumn: false,
      },
    })
    const { shootCustomFields } = useProjectShootCustomFields(projectItem, options)
    expect(shootCustomFields.value.length).toBe(2)
    expect(shootCustomFields.value).toMatchSnapshot()
  })

  it('should add a custom field', async () => {
    const { shootCustomFields, addShootCustomField } = useProjectShootCustomFields(projectItem, options)
    const customField = { name: 'Field1', path: 'path1' }
    expect(shootCustomFields.value.length).toBe(0)
    addShootCustomField(customField)
    expect(shootCustomFields.value.length).toBe(1)
    expect(shootCustomFields.value).toMatchSnapshot()
  })

  it('should delete a custom field', async () => {
    const { shootCustomFields, addShootCustomField, deleteShootCustomField } = useProjectShootCustomFields(projectItem, options)
    const customField = { name: 'Field1', path: 'path1' }
    addShootCustomField(customField)
    expect(shootCustomFields.value.length).toBe(1)
    deleteShootCustomField(customField)
    expect(shootCustomFields.value.length).toBe(0)
  })

  it('should replace a custom field', async () => {
    const { shootCustomFields, addShootCustomField, replaceShootCustomField } = useProjectShootCustomFields(projectItem, options)
    const oldCustomField = { name: 'Field1', path: 'path1' }
    const newCustomField = { name: 'Field2', path: 'path2' }
    addShootCustomField(oldCustomField)
    expect(shootCustomFields.value.length).toBe(1)
    replaceShootCustomField(oldCustomField, newCustomField)
    expect(shootCustomFields.value.length).toBe(1)
    expect(shootCustomFields.value).toContainEqual(expect.objectContaining(newCustomField))
    expect(shootCustomFields.value).not.toContainEqual(expect.objectContaining(oldCustomField))
  })

  it('should check if custom field name is unique', async () => {
    const { addShootCustomField, isShootCustomFieldNameUnique } = useProjectShootCustomFields(projectItem, options)
    const customField = { name: 'Field1', path: 'path1' }
    addShootCustomField(customField)
    expect(isShootCustomFieldNameUnique('Field1')).toBe(false)
    expect(isShootCustomFieldNameUnique('Field2')).toBe(true)
  })

  it('should get custom field by key', async () => {
    const { addShootCustomField, getCustomFieldByKey } = useProjectShootCustomFields(projectItem, options)
    const customField = { name: 'Field1', path: 'path1' }
    addShootCustomField(customField)
    addShootCustomField({ name: 'Field2', path: 'path2' })
    const key = 'Z_field1'
    const result = getCustomFieldByKey(key)
    expect(result).toEqual(expect.objectContaining(customField))
  })

  it('should handle empty custom fields', async () => {
    const { shootCustomFields, rawShootCustomFields } = useProjectShootCustomFields(projectItem, options)
    rawShootCustomFields.value = null
    expect(shootCustomFields.value).toEqual([])
  })

  it('should handle invalid JSON in custom fields', async () => {
    const { shootCustomFields, rawShootCustomFields } = useProjectShootCustomFields(projectItem, options)
    rawShootCustomFields.value = 'invalid JSON'
    expect(shootCustomFields.value).toEqual([])
  })

  it('should generate key from name correctly', () => {
    const { generateKeyFromName } = useProjectShootCustomFields(projectItem, options)
    const name = 'Custom Field Name'
    const key = generateKeyFromName(name)
    expect(key).toBe('Z_customFieldName')
  })

  it('should skip custom fields with invalid values', () => {
    annotations = reactive({
      'dashboard.gardener.cloud/shootCustomFields': JSON.stringify([
        { name: 'Valid Field', path: 'path1' },
        { name: 'Invalid Field1', path: 'path2', value: { key: 'value' } }, // ignored - no objects allowed as values of custom field properties
        { name: 'Invalid Field2', path: { foo: 'bar' } }, // no objects allowed as values of custom field properties
        { name: 'Invalid Field3' }, // ignored, missing required property path
        { path: 'path3' }, // ignored, missing required property name
        {}, // ignored
        null, // ignored
      ]),
    })

    const { shootCustomFields } = useProjectShootCustomFields(projectItem, options)
    expect(shootCustomFields.value.length).toBe(1)
    expect(shootCustomFields.value).toMatchSnapshot()
  })

  it('should ensure the key is not part of the rendered JSON.stringify annotation when adding a new entry', () => {
    const { shootCustomFields, addShootCustomField } = useProjectShootCustomFields(projectItem, options)
    const customField = { name: 'Field1', path: 'path1' }

    // Add the custom field
    addShootCustomField(customField)

    // Verify the key is set correctly
    const addedField = shootCustomFields.value.find(field => field.name === 'Field1')
    expect(addedField.key).toBe('Z_field1')

    // Verify the key is not part of the JSON stringified output in annotations
    const annotationString = annotations['dashboard.gardener.cloud/shootCustomFields']
    expect(annotationString).not.toContain('key')
    expect(annotationString).toMatchSnapshot()
  })

  describe('helper', () => {
    describe('formatValue', () => {
      it('should join array elements with a separator', () => {
        const result = formatValue(['a', 'b', 'c'], ',')
        expect(result).toBe('a,b,c')
      })

      it('should return the value as is for non-array values', () => {
        const result = formatValue('string', ',')
        expect(result).toBe('string')
      })

      it('should return undefined for object values', () => {
        const result = formatValue({ key: 'value' }, ',')
        expect(result).toBeUndefined()
      })
    })

    describe('isCustomField', () => {
      it('should return true for keys starting with "Z_"', () => {
        const result = isCustomField('Z_customField')
        expect(result).toBe(true)
      })

      it('should return false for keys not starting with "Z_"', () => {
        const result = isCustomField('customField')
        expect(result).toBe(false)
      })
    })
  })
})
