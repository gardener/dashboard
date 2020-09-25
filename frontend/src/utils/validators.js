//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { withParams, regex, ref } from 'vuelidate/lib/validators/common'
import { minValue } from 'vuelidate/lib/validators'
import includes from 'lodash/includes'
import get from 'lodash/get'
import { parseSize } from '@/utils'

const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
const uppercaseAlphaNumPattern = /^[A-Z0-9]+$/
const alphaNumUnderscorePattern = /^\w+$/
const alphaNumUnderscoreHyphenPattern = /^[a-zA-Z0-9-_]+$/
const resourceNamePattern = /^[a-z0-9](?:[-a-z0-9]*[a-z0-9])?$/
const consecutiveHyphenPattern = /.?-{2,}.?/
const startEndHyphenPattern = /^-.*.|.*-$/
const numberOrPercentagePattern = /^[\d]+[%]?$/

const base64 = regex('base64', base64Pattern)
const uppercaseAlphaNum = regex('uppercaseAlphaNum', uppercaseAlphaNumPattern)
const alphaNumUnderscore = regex('alphaNumUnderscore', alphaNumUnderscorePattern)
const alphaNumUnderscoreHyphen = regex('alphaNumUnderscoreHyphen', alphaNumUnderscoreHyphenPattern)
const resourceName = regex('resourceName', resourceNamePattern)
const noConsecutiveHyphen = (value) => {
  return !consecutiveHyphenPattern.test(value)
}
const noStartEndHyphen = (value) => {
  return !startEndHyphenPattern.test(value)
}
const numberOrPercentage = (value) => {
  return numberOrPercentagePattern.test(value)
}

const unique = key => withParams({ type: 'unique', key },
  function (value, parentVm) {
    const keys = ref(key, this, parentVm)
    return !includes(keys, value)
  }
)

const uniqueWorkerName = withParams({ type: 'uniqueWorkerName' },
  function unique (value) {
    return this.workers.filter(item => item.name === value).length === 1
  }
)

const requiresCostObjectIfEnabled = withParams({ type: 'requiresCostObjectIfEnabled' },
  function (infrastructureSecret) {
    if (!this.costObjectSettingEnabled) {
      return true
    }
    return get(infrastructureSecret, 'metadata.hasCostObject', false)
  }
)

const serviceAccountKey = withParams({ type: 'serviceAccountKey' },
  function (value) {
    try {
      const key = JSON.parse(value)
      if (key.project_id && alphaNumUnderscoreHyphen(key.project_id)) {
        return true
      }
    } catch (err) { /* ignore error */ }
    return false
  }
)

const includesIfAvailable = (key, reference) => withParams({ type: 'includesIfAvailable', key },
  function (selectedKeys, parentVm) {
    const availableKeys = ref(reference, this, parentVm)
    return includes(availableKeys, key) ? includes(selectedKeys, key) : true
  }
)

const minVolumeSize = key => withParams({ type: 'minVolumeSize', key },
  function (value) {
    if (this.volumeInCloudProfile) {
      return minValue(key)(parseSize(value))
    }
    return true
  }
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
  minVolumeSize,
  uniqueWorkerName,
  numberOrPercentage,
  requiresCostObjectIfEnabled
}
