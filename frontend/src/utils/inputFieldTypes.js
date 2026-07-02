//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export const jsonFieldTypes = new Set([
  'json',
  'json-secret',
])

export const yamlFieldTypes = new Set([
  'yaml',
  'yaml-secret',
])

export const structuredFieldTypes = new Set([
  ...jsonFieldTypes,
  ...yamlFieldTypes,
])

export const structuredSecretFieldTypes = new Set([
  'json-secret',
  'yaml-secret',
])

export const secretFieldTypes = new Set([
  'password',
  ...structuredSecretFieldTypes,
])

export function isJsonFieldType (type) {
  return jsonFieldTypes.has(type)
}

export function isYamlFieldType (type) {
  return yamlFieldTypes.has(type)
}

export function isStructuredFieldType (type) {
  return structuredFieldTypes.has(type)
}

export function isStructuredSecretFieldType (type) {
  return structuredSecretFieldTypes.has(type)
}

export function isSecretFieldType (type) {
  return secretFieldTypes.has(type)
}
