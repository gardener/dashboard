//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { helpers } from '@vuelidate/validators'

import {
  includes,
  get,
} from '@/lodash'

const { withParams, regex, req, withMessage } = helpers

const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
const alphaNumUnderscorePattern = /^\w+$/
const alphaNumUnderscoreHyphenPattern = /^[a-zA-Z0-9-_]+$/
const resourceNamePattern = /^[a-z0-9](?:[-a-z0-9]*[a-z0-9])?$/
const consecutiveHyphenPattern = /.?-{2,}.?/
const startEndHyphenPattern = /^-.*.|.*-$/
const numberOrPercentagePattern = /^[\d]+[%]?$/
export const timezonePattern = /^([+-])(\d{2}):(\d{2})$/

const base64 = withMessage('Must be a valid base64 string', regex(base64Pattern))
const alphaNumUnderscore = withMessage('Must contain only alphanumeric characters and underscore', regex(alphaNumUnderscorePattern))
const resourceName = withMessage('Must contain only alphanumeric characters or hypen', regex(resourceNamePattern))
const noConsecutiveHyphen = withMessage('Must not contain consecutive hyphens', (value) => {
  return !consecutiveHyphenPattern.test(value)
})
const noStartEndHyphen = withMessage('Must not start or end with a hyphen', (value) => {
  return !startEndHyphenPattern.test(value)
})
const numberOrPercentage = withMessage('Must be a number or percentage', (value) => {
  return numberOrPercentagePattern.test(value)
})

const isTimezone = withMessage('TimeZone must have format [+|-]HH:mm', (value) => {
  return timezonePattern.test(value)
})

const unique = key => withMessage(`Value '${key}' must be unique`, withParams(
  { type: 'unique', key },
  function unique (value) {
    const keys = this[
      typeof key === 'function'
        ? key.call(this, value)
        : key
    ]
    return !includes(keys, value)
  },
))

const uniqueWorkerName = withMessage('Worker name must be unique', withParams(
  { type: 'uniqueWorkerName' },
  function unique (value) {
    return this.workers.filter(item => item.name === value).length === 1
  },
))

const requiresCostObjectIfEnabled = withMessage('Cost Object is required', withParams(
  { type: 'requiresCostObjectIfEnabled' },
  function requiresCostObjectIfEnabled (infrastructureSecret) {
    if (!this.costObjectSettingEnabled) {
      return true
    }
    return get(infrastructureSecret, 'metadata.hasCostObject', false)
  },
))

const serviceAccountKey = withMessage('Not a valid Service Account Key',
  withParams(
    { type: 'serviceAccountKey' },
    function serviceAccountKey (value) {
      try {
        const key = JSON.parse(value)
        if (key.project_id && alphaNumUnderscoreHyphenPattern.test(key.project_id)) {
          return true
        }
      } catch (err) { /* ignore error */ }
      return false
    },
  ))

const includesIfAvailable = (key, reference) => withMessage(`Value "${key}" must be selected`,
  withParams(
    { type: 'includesIfAvailable', key },
    function includesIfAvailable (selectedKeys) {
      const availableKeys = this[reference]
      return includes(availableKeys, key) ? includes(selectedKeys, key) : true
    },
  ))

const nilUnless = key => withMessage(`Must not be provided if '${key}' is not set`,
  withParams(
    { type: 'nilUnless', key },
    function nilUnless (value) {
      return !this[key] ? !req(value) : true
    },
  ))

const allWithCauserParam = (causer, validators) => {
  for (const [key, validator] of Object.entries(validators)) {
    if (typeof causer === 'function') {
      validators[key] = withParams({ causer: causer.call(this) }, validator)
    } else {
      validators[key] = withParams({ causer }, validator)
    }
  }
  return validators
}

export {
  withParams,
  withMessage,
  allWithCauserParam,
  regex,
  unique,
  alphaNumUnderscore,
  base64,
  resourceName,
  noConsecutiveHyphen,
  noStartEndHyphen,
  serviceAccountKey,
  includesIfAvailable,
  uniqueWorkerName,
  numberOrPercentage,
  requiresCostObjectIfEnabled,
  isTimezone,
  nilUnless,
}
