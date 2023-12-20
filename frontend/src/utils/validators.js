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
const lowerCaseAlphaNumHyphenPattern = /^[-a-z0-9]*$/
const consecutiveHyphenPattern = /.?-{2,}.?/
const startEndHyphenPattern = /^-.*.|.*-$/
const numberOrPercentagePattern = /^[\d]+[%]?$/
export const timezonePattern = /^([+-])(\d{2}):(\d{2})$/

const base64 = withMessage('Must be a valid base64 string', regex(base64Pattern))
const alphaNumUnderscore = withMessage('Must contain only alphanumeric characters and underscore', regex(alphaNumUnderscorePattern))
const lowerCaseAlphaNumHyphen = withMessage('Must contain only lowercase alphanumeric characters or hyphen', regex(lowerCaseAlphaNumHyphenPattern))
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

const unique = key => withMessage(`Value of property '${key}' must be unique`, withParams(
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

const includesIfAvailable = (key, reference) => withMessage(`Value of property '${key}' must be selected`,
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

const withFieldName = (fieldName, validators) => {
  for (const [key, validator] of Object.entries(validators)) {
    if (typeof fieldName === 'function') {
      fieldName = fieldName.call(this)
    }
    validators[key] = withParams({ fieldName }, validator)
  }
  return validators
}

const messageFromErrors = (errors) => {
  const errorMessages = []
  if (errors) {
    errors.forEach(error => {
      errorMessages.push({
        fieldName: error.$params.fieldName ? error.$params.fieldName : error.$propertyPath,
        message: error.$message,
      })
    })
  }

  return errorMessages.map(msg => `${msg.fieldName}: ${msg.message}`).join(', ')
}

export {
  withParams,
  withMessage,
  withFieldName,
  messageFromErrors,
  regex,
  unique,
  alphaNumUnderscore,
  base64,
  lowerCaseAlphaNumHyphen,
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
