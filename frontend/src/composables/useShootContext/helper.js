//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { toValue } from '@vueuse/core'

import {
  get,
  unset,
  isEmpty,
} from '@/lodash'

export function getId (object) {
  return get(object, 'id')
}

function isNull (value) {
  return value === null
}

function isUndefined (value) {
  return typeof value === 'undefined'
}

function isNil (value) {
  return isNull(value) || isUndefined(value)
}

function isArray (value) {
  return Array.isArray(value)
}

function isObject (value) {
  return typeof value === 'object' && !isNull(value)
}

function cleanup (obj) {
  const cleanupObject = obj => {
    const cleanObj = {}
    for (const [key, value] of Object.entries(obj)) {
      const cleanValue = cleanupValue(value)
      if (!isNull(cleanValue)) {
        cleanObj[key] = cleanValue
      }
    }
    return cleanObj
  }

  const cleanupArray = values => {
    const cleanValues = []
    for (const value of values) {
      const cleanValue = cleanupValue(value)
      if (!isNull(cleanValue)) {
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
    const obj = isArray(value)
      ? cleanupArray(value)
      : cleanupObject(value)
    if (isEmpty(obj)) {
      return null
    }
    return obj
  }

  return cleanupValue(obj)
}

export function normalizeShootManifest (value) {
  const object = Object.assign({
    apiVersion: 'core.gardener.cloud/v1beta1',
    kind: 'Shoot',
  }, toValue(value))
  const workers = get(object, 'spec.provider.workers')
  if (isEmpty(workers)) {
    unset(object, 'spec.provider.infrastructureConfig')
    unset(object, 'spec.provider.controlPlaneConfig')
    unset(object, 'spec.provider.workers')
    unset(object, 'spec.addons')
    unset(object, 'spec.networking')
    unset(object, 'spec.secretBindingName')
    unset(object, 'spec.maintenance.autoUpdate.machineImageVersion')
  }
  return cleanup(object)
}
