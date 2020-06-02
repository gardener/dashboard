//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

'use strict'

import isEmpty from 'lodash/isEmpty'
import includes from 'lodash/includes'
import every from 'lodash/every'
import compact from 'lodash/compact'
import uniq from 'lodash/uniq'
import flatMap from 'lodash/flatMap'

export function allErrorCodesFromLastErrorsOrConditions (lastErrorsOrConditionsarray) {
  return uniq(compact(flatMap(lastErrorsOrConditionsarray, 'codes')))
}

export function isUserError (errorCodes) {
  if (isEmpty(errorCodes)) {
    return false
  }

  const userErrorCodes = [
    'ERR_INFRA_UNAUTHORIZED',
    'ERR_INFRA_INSUFFICIENT_PRIVILEGES',
    'ERR_INFRA_QUOTA_EXCEEDED',
    'ERR_INFRA_DEPENDENCIES',
    'ERR_CLEANUP_CLUSTER_RESOURCES',
    'ERR_INFRA_RESOURCES_DEPLETED',
    'ERR_CONFIGURATION_PROBLEM'
  ]
  return every(errorCodes, errorCode => includes(userErrorCodes, errorCode))
}

export const errorCodes = {
  ERR_INFRA_UNAUTHORIZED: {
    shortDescription: 'Invalid Credentials',
    description: 'Invalid cloud provider credentials.'
  },
  ERR_INFRA_INSUFFICIENT_PRIVILEGES: {
    shortDescription: 'Insufficient Privileges',
    description: 'Cloud provider credentials have insufficient privileges.'
  },
  ERR_INFRA_QUOTA_EXCEEDED: {
    shortDescription: 'Quota Exceeded',
    description: 'Cloud provider quota exceeded. Please request limit increases.'
  },
  ERR_INFRA_DEPENDENCIES: {
    shortDescription: 'Infrastructure Dependencies',
    description: 'Infrastructure operation failed as unmanaged resources exist in your cloud provider account. Please delete all manually created resources related to this Shoot.'
  },
  ERR_CLEANUP_CLUSTER_RESOURCES: {
    shortDescription: 'Cleanup Cluster',
    description: 'Cleaning up the cluster failed as some resource are stuck in deletion. Please remove these resources properly or a forceful deletion will happen if this error persists.'
  },
  ERR_INFRA_RESOURCES_DEPLETED: {
    shortDescription: 'Infrastructure Resources Depleted',
    description: 'The underlying infrastructure provider proclaimed that it does not have enough resources to fulfill your request at this point in time. You might want to wait or change your shoot configuration.'
  },
  ERR_CONFIGURATION_PROBLEM: {
    shortDescription: 'Configuration Problem',
    description: 'There is a configuration problem that is most likely caused by your Shoot specification. Please double-check the error message and resolve the problem.'
  }
}
