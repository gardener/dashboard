//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { helpers } from '@vuelidate/validators'

// Lodash
import includes from 'lodash/includes'
import get from 'lodash/get'

const { withParams, regex, req } = helpers

const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
const uppercaseAlphaNumPattern = /^[A-Z0-9]+$/
const alphaNumUnderscorePattern = /^\w+$/
const alphaNumUnderscoreHyphenPattern = /^[a-zA-Z0-9-_]+$/
const resourceNamePattern = /^[a-z0-9](?:[-a-z0-9]*[a-z0-9])?$/
const consecutiveHyphenPattern = /.?-{2,}.?/
const startEndHyphenPattern = /^-.*.|.*-$/
const numberOrPercentagePattern = /^[\d]+[%]?$/
export const timezonePattern = /^([+-])(\d{2}):(\d{2})$/

const base64 = regex(base64Pattern)
const uppercaseAlphaNum = regex(uppercaseAlphaNumPattern)
const alphaNumUnderscore = regex(alphaNumUnderscorePattern)
const alphaNumUnderscoreHyphen = regex(alphaNumUnderscoreHyphenPattern)
const resourceName = regex(resourceNamePattern)
const noConsecutiveHyphen = (value) => {
  return !consecutiveHyphenPattern.test(value)
}
const noStartEndHyphen = (value) => {
  return !startEndHyphenPattern.test(value)
}
const numberOrPercentage = (value) => {
  return numberOrPercentagePattern.test(value)
}

const isTimezone = (value) => {
  return timezonePattern.test(value)
}

const unique = key => withParams(
  { type: 'unique', key },
  function unique (value) {
    const keys = this[
      typeof key === 'function'
        ? key.call(this, value)
        : key
    ]
    return !includes(keys, value)
  },
)

const uniqueWorkerName = withParams(
  { type: 'uniqueWorkerName' },
  function unique (value) {
    return this.workers.filter(item => item.name === value).length === 1
  },
)

const requiresCostObjectIfEnabled = withParams(
  { type: 'requiresCostObjectIfEnabled' },
  function requiresCostObjectIfEnabled (infrastructureSecret) {
    if (!this.costObjectSettingEnabled) {
      return true
    }
    return get(infrastructureSecret, 'metadata.hasCostObject', false)
  },
)

const serviceAccountKey = withParams(
  { type: 'serviceAccountKey' },
  function serviceAccountKey (value) {
    try {
      const key = JSON.parse(value)
      if (key.project_id && alphaNumUnderscoreHyphen(key.project_id)) {
        return true
      }
    } catch (err) { /* ignore error */ }
    return false
  },
)

const includesIfAvailable = (key, reference) => withParams(
  { type: 'includesIfAvailable', key },
  function includesIfAvailable (selectedKeys) {
    const availableKeys = this[reference]
    return includes(availableKeys, key) ? includes(selectedKeys, key) : true
  },
)

const nilUnless = key => withParams(
  { type: 'nilUnless', key },
  function nilUnless (value) {
    return !this[key] ? !req(value) : true
  },
)

export {
  withParams,
  regex,
  unique,
  uppercaseAlphaNum,
  alphaNumUnderscore,
  alphaNumUnderscoreHyphen,
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
