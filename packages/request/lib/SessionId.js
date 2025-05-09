//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import crypto from 'crypto'
import { get, set } from 'lodash-es'

const kOptions = Symbol('options')

class SessionId extends URL {
  constructor (authority, options = {}) {
    super(createPath(options), authority)
    this[kOptions] = options // eslint-disable-line security/detect-object-injection
  }

  getOptions () {
    return this[kOptions] // eslint-disable-line security/detect-object-injection
  }
}

function normalizeObject (object) {
  const normalizedObject = {}
  for (const key of Object.keys(object).sort()) {
    const value = get(object, [key])
    let normalizedValue
    switch (typeof value) {
      case 'string':
      case 'number':
      case 'boolean':
        normalizedValue = value
        break
      case 'object':
        if (value) {
          normalizedValue = normalizeObject(value)
        }
        break
      case 'undefined':
        break
    }
    if (typeof normalizedValue !== 'undefined') {
      set(normalizedObject, [key], normalizedValue)
    }
  }
  return normalizedObject
}

function createObjectHash (object) {
  return crypto
    .createHash('sha1')
    .update(JSON.stringify(normalizeObject(object)))
    .digest('hex')
    .substring(0, 7)
}

function createPath ({ id, ...options }) {
  let path = ''
  if (id) {
    path += '/' + id
  }
  path += '#' + createObjectHash(options)
  return path
}

export default SessionId
