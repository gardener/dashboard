//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { withParams, regex, ref } from 'vuelidate/lib/validators/common'
import { minValue } from 'vuelidate/lib/validators'
import includes from 'lodash/includes'
import { parseSize } from '@/utils'

const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
const uppercaseAlphaNumPattern = /^[A-Z0-9]+$/
const alphaNumUnderscorePattern = /^\w+$/
const alphaNumUnderscoreHyphenPattern = /^[a-zA-Z0-9-_]+$/
const resourceNamePattern = /^[a-z0-9](?:[-a-z0-9]*[a-z0-9])?$/
const consecutiveHyphenPattern = /.?-{2,}.?/
const startEndHyphenPattern = /^-.*.|.*-$/

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

const minVolumeSize = key => withParams({ type: 'minVolumeSize', key },
  function (value) {
    return minValue(key)(parseSize(value))
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
  minVolumeSize,
  uniqueWorkerName
}
