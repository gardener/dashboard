//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

import md5js from 'uuid/dist/md5-browser'
import sha1js from 'uuid/dist/sha1-browser'
import rngjs from 'uuid/dist/rng-browser'

export function toHex (input) {
  return Buffer.from(input).toString('hex')
}

export function md5 (value) {
  return toHex(md5js(value))
}

export function sha1 (value) {
  return toHex(sha1js(value))
}

export function rng (value) {
  return toHex(rngjs(value))
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
    accumulator[key] = normalizeValue(obj[key])
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
