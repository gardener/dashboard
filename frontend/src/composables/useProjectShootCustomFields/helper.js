//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  isObject,
  startsWith,
} from '@/lodash'

// formatValue formats a value by joining array elements with a separator or returning the value as is.
// Returns undefined for object values.
export function formatValue (value, separator) {
  if (isSimpleArray(value)) {
    return value.join(separator)
  }

  if (isObject(value)) {
    return // object values are not supported
  }

  return value
}

// isSimpleArray checks if the input is an array of primitive types
function isSimpleArray (value) {
  if (!Array.isArray(value)) {
    return false
  }

  return value.every(isPrimitive)
}

function isPrimitive (value) {
  return value !== Object(value)
}

export function isCustomField (key) {
  return startsWith(key, 'Z_')
}
