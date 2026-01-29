//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

import md5 from 'md5'

import get from 'lodash/get'
import set from 'lodash/set'

export { md5 }

export async function sha256 (value) {
  const encoder = new TextEncoder()
  const data = encoder.encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('')
}

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
    const value = get(obj, [key])
    return set(accumulator, [key], normalizeValue(value))
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
