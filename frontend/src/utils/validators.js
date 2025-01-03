//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { helpers } from '@vuelidate/validators'
import { Base64 } from 'js-base64'

import get from 'lodash/get'
import set from 'lodash/set'
import includes from 'lodash/includes'

const { withParams, regex, withMessage } = helpers

const alphaNumUnderscorePattern = /^\w+$/
const lowerCaseAlphaNumHyphenPattern = /^[-a-z0-9]*$/
const consecutiveHyphenPattern = /.?-{2,}.?/
const startEndHyphenPattern = /^-.*.|.*-$/
const numberOrPercentagePattern = /^[\d]+[%]?$/
const guidPattern = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/
export const timezonePattern = /^([+-])(\d{2}):(\d{2})$/

const base64 = withMessage('Must be a valid base64 string', value => {
  return Base64.isValid(value)
})
const alphaNumUnderscore = withMessage('Must contain only alphanumeric characters and underscore', regex(alphaNumUnderscorePattern))
const lowerCaseAlphaNumHyphen = withMessage('Must contain only lowercase alphanumeric characters or hyphen', regex(lowerCaseAlphaNumHyphenPattern))
const noConsecutiveHyphen = withMessage('Must not contain consecutive hyphens', value => {
  return !consecutiveHyphenPattern.test(value)
})
const noStartEndHyphen = withMessage('Must not start or end with a hyphen', value => {
  return !startEndHyphenPattern.test(value)
})
const numberOrPercentage = withMessage('Must be a number or percentage', value => {
  return numberOrPercentagePattern.test(value)
})
const guid = withMessage('Must be a valid GUID', regex(guidPattern))

const isTimezone = withMessage('TimeZone must have format [+|-]HH:mm', value => {
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

const includesIfAvailable = (key, reference) => withMessage(`Value of property '${key}' must be selected`,
  withParams(
    { type: 'includesIfAvailable', key },
    function includesIfAvailable (selectedKeys) {
      const availableKeys = get(this, [reference])
      return includes(availableKeys, key) ? includes(selectedKeys, key) : true
    },
  ))

const withFieldName = (fieldName, validators) => {
  for (const [key, validator] of Object.entries(validators)) {
    if (typeof fieldName === 'function') {
      fieldName = fieldName.call(this)
    }
    set(validators, [key], withParams({ fieldName }, validator))
  }
  return validators
}

const messageFromErrors = errors => {
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
  includesIfAvailable,
  numberOrPercentage,
  isTimezone,
  guid,
}
