//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import set from 'lodash/set'
import isEmpty from 'lodash/isEmpty'
import isNil from 'lodash/isNil'
import isObject from 'lodash/isObject'

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
