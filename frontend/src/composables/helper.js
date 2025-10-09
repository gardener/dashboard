//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { getDateFormatted } from '@/utils'

import set from 'lodash/set'
import isEmpty from 'lodash/isEmpty'
import isNil from 'lodash/isNil'
import isObject from 'lodash/isObject'
import find from 'lodash/find'
import head from 'lodash/head'

export function cleanup (obj) {
  const cleanupObject = obj => {
    const cleanObj = {}
    for (const [key, value] of Object.entries(obj)) {
      const cleanValue = cleanupValue(value)
      if (cleanValue !== null) {
        set(cleanObj, [key], cleanValue)
      }
    }
    return cleanObj
  }

  const cleanupArray = values => {
    const cleanValues = []
    for (const value of values) {
      const cleanValue = cleanupValue(value)
      if (cleanValue !== null) {
        cleanValues.push(cleanValue)
      }
    }
    return cleanValues
  }

  const cleanupValue = value => {
    if (isNil(value)) {
      return null
    }
    if (!isObject(value)) {
      return value
    }
    if (isEmpty(value)) {
      return null
    }
    const obj = Array.isArray(value)
      ? cleanupArray(value)
      : cleanupObject(value)
    if (isEmpty(obj)) {
      return null
    }
    return obj
  }

  return cleanupValue(obj)
}

export function decorateClassificationObject (plainObject) {
  const object = { ...plainObject }
  object.classification ??= 'supported'
  Object.defineProperty(object, 'isPreview', {
    value: object.classification === 'preview',
    enumerable: true,
  })
  Object.defineProperty(object, 'isDeprecated', {
    value: object.classification === 'deprecated',
    enumerable: true,
  })
  Object.defineProperty(object, 'isSupported', {
    get () {
      return this.classification === 'supported' && !this.isExpired
    },
    enumerable: true,
  })
  Object.defineProperty(object, 'expiresIn', {
    get () {
      if (!this.expirationDate) {
        return Number.POSITIVE_INFINITY
      }
      return Math.floor((new Date(this.expirationDate).getTime() - Date.now()) / (24 * 3600 * 1000))
    },
  })
  Object.defineProperty(object, 'isExpired', {
    get () {
      return this.expiresIn <= 0
    },
    enumerable: true,
  })
  Object.defineProperty(object, 'isExpirationWarning', {
    get () {
      return this.expiresIn <= 30
    },
    enumerable: true,
  })
  Object.defineProperty(object, 'expirationDateString', {
    value: getDateFormatted(object.expirationDate),
    enumerable: true,
  })

  return object
}

// Return first item with classification supported, if no item has classification supported
// return first item with classifiction undefined, if no item matches these requirements,
// return first item in list
export function firstItemMatchingVersionClassification (items) {
  let defaultItem = find(items, { classification: 'supported' })
  if (defaultItem) {
    return defaultItem
  }

  defaultItem = find(items, machineImage => {
    return machineImage.classification === undefined
  })
  if (defaultItem) {
    return defaultItem
  }

  return head(items)
}
