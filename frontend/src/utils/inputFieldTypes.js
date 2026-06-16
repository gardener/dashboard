//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export const structuredFieldTypes = new Set([
  'json',
  'yaml',
])

export function isPemFieldType (type) {
  return type === 'pem'
}

export function isJsonFieldType (type) {
  return type === 'json'
}

export function isYamlFieldType (type) {
  return type === 'yaml'
}

export function isStructuredFieldType (type) {
  return structuredFieldTypes.has(type)
}
