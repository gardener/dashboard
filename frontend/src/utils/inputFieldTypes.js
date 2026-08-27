//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

export const structuredFieldTypes = new Set([
  'json',
  'yaml',
])

export function isJsonFieldType (type) {
  return type === 'json'
}

export function isYamlFieldType (type) {
  return type === 'yaml'
}

export function isStructuredFieldType (type) {
  return structuredFieldTypes.has(type)
}
