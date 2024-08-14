//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

import md5 from 'md5'

export { md5 }

export function normalizeObject (obj) {
  if (!obj) {
    return null
  }
  if (obj instanceof Set) {
    obj = Array.from(obj)
  }
  if (Array.isArray(obj)) {
    return obj.map(normalizeValue)
  }
  if (obj instanceof Map) {
    obj = Object.fromEntries(obj)
  }
  return Object.keys(obj).sort().reduce((accumulator, key) => {
    accumulator[key] = normalizeValue(obj[key]) // eslint-disable-line security/detect-object-injection
    return accumulator
  }, {})
}

export function normalizeValue (value) {
  switch (typeof value) {
    case 'string':
    case 'number':
    case 'boolean':
      return value
    case 'object':
      return normalizeObject(value)
  }
}

export function hash (value) {
  value = normalizeValue(value)
  return md5(typeof value !== 'undefined' ? JSON.stringify(value) : '')
}
